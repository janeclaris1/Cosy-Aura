import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { BOTTLE_SIZES, isBottleSize, type BottleSize } from "@/lib/bottle-sizes";

/** First digit of every auto barcode — quick visual size ID at POS. */
export const BARCODE_SIZE_LEAD_DIGIT: Record<BottleSize, string> = {
  30: "3",
  50: "5",
  100: "1",
};

export function normalizeBarcode(raw: string): string {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, "");
}

export function barcodeMatchesSize(barcode: string, bottleSize: BottleSize): boolean {
  const code = normalizeBarcode(barcode);
  return code.startsWith(BARCODE_SIZE_LEAD_DIGIT[bottleSize]);
}

/** EAN-13 check digit for a 12-digit base string. */
function ean13CheckDigit(base12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = Number(base12[i]);
    sum += i % 2 === 0 ? d : d * 3;
  }
  return String((10 - (sum % 10)) % 10);
}

/**
 * Deterministic EAN-13 per fragrance × size.
 * 30 ml → starts with 3, 50 ml → 5, 100 ml → 1.
 */
export function generateDeterministicBarcode(
  fragranceId: string,
  bottleSize: BottleSize,
  salt = 0
): string {
  const lead = BARCODE_SIZE_LEAD_DIGIT[bottleSize];
  const digest = createHash("sha256")
    .update(`${fragranceId}:${bottleSize}:${salt}`)
    .digest();
  let n = 0n;
  for (let i = 0; i < 8; i++) n = (n << 8n) | BigInt(digest[i]);
  const eleven = (n % 10_000_000_000n).toString().padStart(11, "0");
  const base12 = `${lead}${eleven}`;
  return base12 + ean13CheckDigit(base12);
}

async function reserveUniqueBarcode(
  fragranceId: string,
  bottleSize: BottleSize
): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const barcode = generateDeterministicBarcode(fragranceId, bottleSize, attempt);
    const conflict = await prisma.fragranceBarcode.findFirst({
      where: { barcode, NOT: { fragranceId, bottleSize } },
      select: { id: true },
    });
    if (!conflict) return barcode;
  }
  return generateDeterministicBarcode(fragranceId, bottleSize, Date.now());
}

async function upsertSizeBarcode(
  fragranceId: string,
  bottleSize: BottleSize
): Promise<"created" | "updated" | "unchanged"> {
  const existing = await prisma.fragranceBarcode.findUnique({
    where: {
      fragranceId_bottleSize: { fragranceId, bottleSize },
    },
    select: { id: true, barcode: true },
  });

  const barcode = await reserveUniqueBarcode(fragranceId, bottleSize);

  if (!existing) {
    await prisma.fragranceBarcode.create({
      data: { fragranceId, bottleSize, barcode },
    });
    return "created";
  }

  if (existing.barcode === barcode && barcodeMatchesSize(existing.barcode, bottleSize)) {
    return "unchanged";
  }

  await prisma.fragranceBarcode.update({
    where: { id: existing.id },
    data: { barcode },
  });
  return "updated";
}

/** Create or fix 30 / 50 / 100 ml barcodes (correct size prefix). */
export async function ensureFragranceBarcodes(fragranceId: string): Promise<number> {
  let changed = 0;
  for (const bottleSize of BOTTLE_SIZES) {
    const result = await upsertSizeBarcode(fragranceId, bottleSize);
    if (result !== "unchanged") changed++;
  }
  return changed;
}

/** Ensure every fragrance has barcodes; reformat any that use the old prefix. */
export async function backfillAllFragranceBarcodes(): Promise<{
  fragrances: number;
  created: number;
  updated: number;
}> {
  const fragrances = await prisma.fragrance.findMany({ select: { id: true } });
  let created = 0;
  let updated = 0;

  for (const { id } of fragrances) {
    for (const bottleSize of BOTTLE_SIZES) {
      const result = await upsertSizeBarcode(id, bottleSize);
      if (result === "created") created++;
      else if (result === "updated") updated++;
    }
  }

  return { fragrances: fragrances.length, created, updated };
}

/** Upsert manually entered barcodes; must match size prefix (3 / 5 / 1). */
export async function syncFragranceBarcodes(
  fragranceId: string,
  barcodes: { bottleSize: number; barcode: string }[]
): Promise<void> {
  const valid = barcodes
    .map((b) => ({
      bottleSize: Number(b.bottleSize),
      barcode: normalizeBarcode(b.barcode),
    }))
    .filter((b) => isBottleSize(b.bottleSize) && b.barcode.length >= 4);

  const seen = new Set<string>();
  for (const row of valid) {
    if (seen.has(row.barcode)) {
      throw new Error(`Duplicate barcode: ${row.barcode}`);
    }
    seen.add(row.barcode);
    if (!barcodeMatchesSize(row.barcode, row.bottleSize)) {
      throw new Error(
        `${row.bottleSize} ml barcode must start with ${BARCODE_SIZE_LEAD_DIGIT[row.bottleSize]}`
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const row of valid) {
      const conflict = await tx.fragranceBarcode.findFirst({
        where: {
          barcode: row.barcode,
          NOT: { fragranceId, bottleSize: row.bottleSize },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new Error(`Barcode already used by another product: ${row.barcode}`);
      }

      await tx.fragranceBarcode.upsert({
        where: {
          fragranceId_bottleSize: {
            fragranceId,
            bottleSize: row.bottleSize,
          },
        },
        create: {
          fragranceId,
          bottleSize: row.bottleSize,
          barcode: row.barcode,
        },
        update: { barcode: row.barcode },
      });
    }
  });
}
