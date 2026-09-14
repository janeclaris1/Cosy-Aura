/**
 * Upsert a batch of catalog perfumes and seed branch stock (50 ml).
 *
 * Usage:
 *   npx tsx scripts/add-perfume-inventory.ts          # dry run
 *   npx tsx scripts/add-perfume-inventory.ts --apply
 */
import { createHash } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { catalog } from "../prisma/oil-catalog";
import { lanvinLattafaLaverneReferences } from "../prisma/oil-catalog-batch-lanvin-lattafa-laverne";
import { BOTTLE_SIZES, type BottleSize } from "../src/lib/bottle-sizes";
import { syncCountryPoolFromBranches } from "../src/lib/branches";
import { createScriptPrisma } from "./lib/script-prisma";

const apply = process.argv.includes("--apply");

/** References for the new batch (see prisma/oil-catalog-batch-lanvin-lattafa-laverne.ts). */
const NEW_REFERENCES = lanvinLattafaLaverneReferences;

const STOCK_PER_BRANCH_50ML = 10;

const BARCODE_LEAD: Record<BottleSize, string> = { 30: "3", 50: "5", 100: "1" };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function ean13CheckDigit(base12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = Number(base12[i]);
    sum += i % 2 === 0 ? d : d * 3;
  }
  return String((10 - (sum % 10)) % 10);
}

function generateBarcode(fragranceId: string, bottleSize: BottleSize, salt = 0): string {
  const lead = BARCODE_LEAD[bottleSize];
  const digest = createHash("sha256")
    .update(`${fragranceId}:${bottleSize}:${salt}`)
    .digest();
  let n = 0n;
  for (let i = 0; i < 8; i++) n = (n << 8n) | BigInt(digest[i]);
  const eleven = (n % 10_000_000_000n).toString().padStart(11, "0");
  const base12 = `${lead}${eleven}`;
  return base12 + ean13CheckDigit(base12);
}

async function ensureBarcodes(prisma: PrismaClient, fragranceId: string) {
  for (const bottleSize of BOTTLE_SIZES) {
    const existing = await prisma.fragranceBarcode.findUnique({
      where: { fragranceId_bottleSize: { fragranceId, bottleSize } },
      select: { id: true, barcode: true },
    });

    let barcode = generateBarcode(fragranceId, bottleSize);
    for (let attempt = 0; attempt < 8; attempt++) {
      const conflict = await prisma.fragranceBarcode.findFirst({
        where: { barcode, NOT: { fragranceId, bottleSize } },
        select: { id: true },
      });
      if (!conflict) break;
      barcode = generateBarcode(fragranceId, bottleSize, attempt);
    }

    if (!existing) {
      await prisma.fragranceBarcode.create({
        data: { fragranceId, bottleSize, barcode },
      });
    } else if (existing.barcode !== barcode) {
      await prisma.fragranceBarcode.update({
        where: { id: existing.id },
        data: { barcode },
      });
    }
  }
}

async function main() {
  const items = catalog.filter((c) => NEW_REFERENCES.has(c.reference));
  if (items.length !== NEW_REFERENCES.size) {
    throw new Error(
      `Expected ${NEW_REFERENCES.size} catalog rows, found ${items.length}. Check oil-catalog.ts references.`
    );
  }

  console.log(
    apply ? "Applying inventory import…" : "Dry run — pass --apply to write to DB"
  );
  console.log(`Products: ${items.length}`);

  if (!apply) {
    for (const item of items) {
      console.log(`  CREATE/UPDATE ${item.brand} · ${item.model} (${item.reference})`);
    }
    return;
  }

  const { prisma, disconnect } = createScriptPrisma();

  try {
    const branches = await prisma.branch.findMany({
      where: { active: true, country: "GH" },
      select: { id: true, name: true },
    });
    console.log(`GH branches: ${branches.length}`);

    for (const item of items) {
      const slug = slugify(`${item.brandSlug}-${item.model}-${item.reference}`);

      const brand = await prisma.brand.upsert({
        where: { slug: item.brandSlug },
        update: { name: item.brand },
        create: { name: item.brand, slug: item.brandSlug },
      });
      const concentration = item.concentration ?? "PARFUM";
      const collection = item.collection ?? "Oil Atelier";

      const data = {
        brandId: brand.id,
        model: item.model,
        reference: item.reference,
        description: item.description,
        conditionReport:
          "Brand new sealed perfume oil. Alcohol-free formula in frosted glass with wooden sphere cap. Available in 30ml, 50ml, and 100ml.",
        price: item.price,
        condition: "UNWORN" as const,
        year: item.year ?? 2025,
        fragranceFamily: item.family,
        bottleMaterial: "GLASS" as const,
        bottleDetail: "Frosted glass with spherical wooden cap",
        bottleSize: 50,
        capType: "DAB_ON" as const,
        liquidColor: "Golden amber perfume oil",
        longevity: item.longevity,
        bottleShape: "Round",
        concentration,
        topNotes: item.topNotes,
        heartNotes: item.heartNotes,
        baseNotes: item.baseNotes,
        sillage: item.sillage,
        sustainabilityScore: 5,
        isVegan: true,
        isCrueltyFree: true,
        sampleAvailable: true,
        gender: item.gender,
        collection,
        stock: STOCK_PER_BRANCH_50ML * Math.max(branches.length, 1),
        rating: 4.7,
        featured: item.featured ?? false,
        category: item.category,
      };

      const existing = await prisma.fragrance.findUnique({ where: { slug } });

      const fragrance = existing
        ? await prisma.fragrance.update({ where: { slug }, data })
        : await prisma.fragrance.create({ data: { ...data, slug } });

      await prisma.fragranceImage.deleteMany({ where: { fragranceId: fragrance.id } });
      if (item.images.length) {
        await prisma.fragranceImage.createMany({
          data: item.images.map((url, i) => ({
            fragranceId: fragrance.id,
            url,
            alt: `${item.brand} ${item.model} oil perfume`,
            isPrimary: i === 0,
            sortOrder: i,
          })),
        });
      }

      await ensureBarcodes(prisma, fragrance.id);

      for (const branch of branches) {
        await prisma.branchStock.upsert({
          where: {
            branchId_fragranceId_bottleSize: {
              branchId: branch.id,
              fragranceId: fragrance.id,
              bottleSize: 50,
            },
          },
          create: {
            branchId: branch.id,
            fragranceId: fragrance.id,
            bottleSize: 50,
            quantity: STOCK_PER_BRANCH_50ML,
          },
          update: { quantity: STOCK_PER_BRANCH_50ML },
        });
      }

      for (const country of ["GH", "CM"] as const) {
        await syncCountryPoolFromBranches(fragrance.id, country);
      }

      console.log(
        `✓ ${item.brand} · ${item.model} — stock ${STOCK_PER_BRANCH_50ML}×50ml on ${branches.length} branch(es)`
      );
    }

    console.log("\nDone. Barcodes created for 30 / 50 / 100 ml. Refresh admin catalogue & POS.");
  } finally {
    await disconnect();
  }
}

main().catch((e) => {
  if (e && typeof e === "object" && "code" in e && e.code === "P1001") {
    console.error(
      "\nCould not reach Neon. Try:\n" +
        "  1. Wake the database (open Neon console or retry in ~10s)\n" +
        "  2. Confirm DIRECT_URL and DATABASE_URL in .env\n" +
        "  3. Run: npx prisma migrate status  (to verify connectivity)\n"
    );
  }
  console.error(e);
  process.exit(1);
});
