/**
 * Import Audemars Piguet Royal Oak Tourbillon Extra Thin 26521PT.YY.1220PT.01
 *
 * Source: https://wristaficionado.com/products/audemars-piguet-royal-oak-tourbillon-extra-thin-platinum-baguette-bezel-blue-dial-26521pt-yy-1220pt-01
 *
 * Usage:
 *   npx tsx scripts/import-audemars-piguet-royal-oak-tourbillon-26521pt-wristaficionado.ts
 *   npx tsx scripts/import-audemars-piguet-royal-oak-tourbillon-26521pt-wristaficionado.ts --apply
 */
import { createHash } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { BOTTLE_SIZES, type BottleSize } from "../src/lib/bottle-sizes";
import { rebuildWatchDescriptionFromRecord } from "./lib/catalog-product-description";
import { downloadWatchImagesFromUrls } from "./lib/catalog-image-import";
import { createScriptPrisma } from "./lib/script-prisma";
import { defaultCatalogCostPriceGhs } from "./lib/catalog-cost";

const apply = process.argv.includes("--apply");

const PRODUCT_URL =
  "https://wristaficionado.com/products/audemars-piguet-royal-oak-tourbillon-extra-thin-platinum-baguette-bezel-blue-dial-26521pt-yy-1220pt-01";

const PRICE_GHS = 1300;
const STOCK_PER_BRANCH = 1;

const BRAND = "Audemars Piguet";
const MODEL = "Royal Oak Tourbillon Extra-Thin Sapphire Bezel";
const REFERENCE = "26521PT.YY.1220PT.01";
const COLLECTION = "Royal Oak";

const IMAGE_URLS = [
  "https://cdn.shopify.com/s/files/1/0266/7141/5373/files/audemars-piguet-royal-oak-tourbillon-extra-thin-platinum-baguette-bezel-blue-dial-26521pt-yy-1220pt-01-audemars-piguet-40260402282740_grande.png?v=1706811119",
  "https://cdn.shopify.com/s/files/1/0266/7141/5373/files/audemars-piguet-royal-oak-tourbillon-extra-thin-platinum-baguette-bezel-blue-dial-26521pt-yy-1220pt-01-audemars-piguet-40260402282740.png?v=1706811119",
];

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

async function syncCountryPool(
  prisma: PrismaClient,
  fragranceId: string,
  country: "GH" | "CM"
) {
  const branches = await prisma.branch.findMany({
    where: { country, active: true },
    select: { id: true },
  });
  const branchIds = branches.map((b) => b.id);
  const agg = branchIds.length
    ? await prisma.branchStock.aggregate({
        where: { fragranceId, branchId: { in: branchIds } },
        _sum: { quantity: true },
      })
    : { _sum: { quantity: 0 } };
  const quantity = Number(agg._sum.quantity || 0);

  await prisma.fragranceCountryStock.upsert({
    where: { fragranceId_country: { fragranceId, country } },
    create: { fragranceId, country, quantity, inStock: quantity > 0 },
    update: { quantity, inStock: quantity > 0 },
  });
}

const LEAD = `The Royal Oak Tourbillon Extra-Thin in platinum elevates the iconic octagonal case with a smoked blue Tapisserie Evolutive dial and a bezel set with 32 graduated baguette-cut blue sapphires. At 41 mm and just 9 mm thick, the 950 platinum case and integrated bracelet deliver a rare balance of presence and wearability.

Hand-wound calibre 2924 powers hours, minutes, and a flying tourbillon with approximately 70 hours of power reserve, visible through the openworked dial and exhibition caseback. Glareproofed sapphire crystal, 50 metres water resistance, and AP folding clasp complete a boutique-era Royal Oak tourbillon with original box and papers.`;

function buildDescription(): string {
  return rebuildWatchDescriptionFromRecord({
    model: MODEL,
    reference: REFERENCE,
    category: "Dress Watches",
    collection: COLLECTION,
    bottleDetail:
      "41 mm platinum · 9 mm thick · sapphire bezel · sapphire crystal · 50 m WR",
    liquidColor: "Smoked blue Tapisserie Evolutive · white gold hands",
    longevity: "Calibre 2924 manual tourbillon · ~70 h power reserve",
    bottleSize: 41,
    condition: "UNWORN",
    lead: LEAD,
    legacyDescription: `Specifications
- Reference: ${REFERENCE}
- Collection: Royal Oak
- Case: 41 mm × 9 mm, 950 platinum
- Bezel: 32 baguette-cut blue sapphires (~3.65 ct, graduated)
- Dial: Smoked blue Tapisserie Evolutive pattern
- Crystal: Glareproofed sapphire front and exhibition back
- Bracelet: 950 platinum with AP folding clasp
- Movement: Hand-wound calibre 2924, flying tourbillon
- Power reserve: ~70 hours (indicator on caseback)
- Water resistance: 50 metres
- Included: Original box and papers`,
  });
}

const CONDITION_REPORT =
  "New Royal Oak tourbillon. 41 mm platinum case and bracelet, smoked blue Evolutive dial, sapphire baguette bezel. Hand-wound calibre 2924 with ~70 h reserve. Sapphire crystal, 50 m WR. Full set with box and papers.";

async function main() {
  console.log(apply ? "Importing watch…" : "Dry run — pass --apply to write");
  console.log(`Source: ${PRODUCT_URL}\n`);

  const brandSlug = slugify(BRAND);
  const slug = slugify(`${brandSlug}-royal-oak-tourbillon-extra-thin-${REFERENCE}`);

  console.log(`Brand: ${BRAND}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Reference: ${REFERENCE}`);
  console.log(`Slug: ${slug}`);
  console.log(`Price: ${PRICE_GHS} GHS`);
  console.log(`Images: ${IMAGE_URLS.length} product photos\n`);

  const imageUrls = await downloadWatchImagesFromUrls(IMAGE_URLS, slug, apply);

  if (!apply) {
    console.log("\nDry run complete. Re-run with --apply to persist.");
    return;
  }

  const { prisma, disconnect } = createScriptPrisma();

  try {
    const branches = await prisma.branch.findMany({
      where: { active: true, country: "GH" },
      select: { id: true, name: true },
    });

    const brand = await prisma.brand.upsert({
      where: { slug: brandSlug },
      update: { name: BRAND },
      create: { name: BRAND, slug: brandSlug },
    });

    const series = await prisma.series.upsert({
      where: { brandId_slug: { brandId: brand.id, slug: "royal-oak" } },
      update: { name: "Royal Oak" },
      create: { brandId: brand.id, name: "Royal Oak", slug: "royal-oak" },
    });

    const description = buildDescription();

    const data = {
      productType: "WATCH" as const,
      brandId: brand.id,
      seriesId: series.id,
      model: MODEL,
      reference: REFERENCE,
      description,
      conditionReport: CONDITION_REPORT,
      price: PRICE_GHS,
      costPriceGhs: defaultCatalogCostPriceGhs("WATCH", data.bottleSize ?? 50),
      condition: "UNWORN" as const,
      fragranceFamily: "WOODY" as const,
      bottleMaterial: "METAL" as const,
      bottleDetail:
        "41 mm platinum · 9 mm thick · sapphire bezel · sapphire crystal · 50 m WR",
      bottleSize: 41,
      capType: "MAGNETIC" as const,
      liquidColor: "Smoked blue Tapisserie Evolutive · white gold hands",
      longevity: "Calibre 2924 manual tourbillon · ~70 h power reserve",
      bottleShape: "Royal Oak octagonal",
      concentration: "EDP" as const,
      topNotes: [] as string[],
      heartNotes: [] as string[],
      baseNotes: [] as string[],
      sillage: "MODERATE" as const,
      sustainabilityScore: 3,
      isVegan: false,
      isCrueltyFree: true,
      sampleAvailable: false,
      gender: "UNISEX" as const,
      collection: COLLECTION,
      stock: STOCK_PER_BRANCH * Math.max(branches.length, 1),
      rating: 4.9,
      featured: true,
      category: "Dress Watches",
    };

    const existing = await prisma.fragrance.findUnique({ where: { slug } });
    const fragrance = existing
      ? await prisma.fragrance.update({ where: { slug }, data })
      : await prisma.fragrance.create({ data: { ...data, slug } });

    await prisma.fragranceImage.deleteMany({ where: { fragranceId: fragrance.id } });
    if (imageUrls.length) {
      await prisma.fragranceImage.createMany({
        data: imageUrls.map((url, i) => ({
          fragranceId: fragrance.id,
          url,
          alt: `${BRAND} ${MODEL} luxury watch`,
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
          quantity: STOCK_PER_BRANCH,
        },
        update: { quantity: STOCK_PER_BRANCH },
      });
    }

    for (const country of ["GH", "CM"] as const) {
      await syncCountryPool(prisma, fragrance.id, country);
    }

    console.log(`\n✓ Imported ${BRAND} ${MODEL}`);
    console.log(`  Product page: /watches/${slug}`);
    console.log(`  Admin: /admin/fragrances/${fragrance.id}/edit`);
    console.log(`  Images saved: ${imageUrls.length}`);
  } finally {
    await disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
