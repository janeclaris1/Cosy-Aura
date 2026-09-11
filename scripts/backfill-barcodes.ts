/**
 * Create or reformat POS barcodes (30→3, 50→5, 100→1 prefix).
 *
 * Usage: npx tsx scripts/backfill-barcodes.ts
 */
import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { BOTTLE_SIZES, type BottleSize } from "../src/lib/bottle-sizes";

const prisma = new PrismaClient();

const LEAD: Record<BottleSize, string> = { 30: "3", 50: "5", 100: "1" };

function ean13CheckDigit(base12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = Number(base12[i]);
    sum += i % 2 === 0 ? d : d * 3;
  }
  return String((10 - (sum % 10)) % 10);
}

function generateBarcode(fragranceId: string, bottleSize: BottleSize, salt = 0): string {
  const lead = LEAD[bottleSize];
  const digest = createHash("sha256")
    .update(`${fragranceId}:${bottleSize}:${salt}`)
    .digest();
  let n = 0n;
  for (let i = 0; i < 8; i++) n = (n << 8n) | BigInt(digest[i]);
  const eleven = (n % 10_000_000_000n).toString().padStart(11, "0");
  const base12 = `${lead}${eleven}`;
  return base12 + ean13CheckDigit(base12);
}

function matchesSize(barcode: string, bottleSize: BottleSize): boolean {
  return barcode.startsWith(LEAD[bottleSize]);
}

async function main() {
  const fragrances = await prisma.fragrance.findMany({ select: { id: true } });
  let created = 0;
  let updated = 0;

  for (const { id } of fragrances) {
    for (const bottleSize of BOTTLE_SIZES) {
      const existing = await prisma.fragranceBarcode.findUnique({
        where: { fragranceId_bottleSize: { fragranceId: id, bottleSize } },
        select: { id: true, barcode: true },
      });

      let barcode = generateBarcode(id, bottleSize);
      for (let attempt = 0; attempt < 8; attempt++) {
        const conflict = await prisma.fragranceBarcode.findFirst({
          where: { barcode, NOT: { fragranceId: id, bottleSize } },
          select: { id: true },
        });
        if (!conflict) break;
        barcode = generateBarcode(id, bottleSize, attempt);
      }

      if (!existing) {
        await prisma.fragranceBarcode.create({
          data: { fragranceId: id, bottleSize, barcode },
        });
        created++;
      } else if (!matchesSize(existing.barcode, bottleSize) || existing.barcode !== barcode) {
        await prisma.fragranceBarcode.update({
          where: { id: existing.id },
          data: { barcode },
        });
        updated++;
      }
    }
  }

  console.log(
    `Done — ${created} created, ${updated} updated (${fragrances.length} fragrances).`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
