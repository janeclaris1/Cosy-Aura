/**
 * Import Tissot PRX 40mm Green Dial (T137.410.11.091.00)
 *
 * Source: https://www.tissotwatches.com/en-en/T1374101109100.html
 * Images: Watches of Switzerland Shopify CDN
 *
 * Usage:
 *   npx tsx scripts/import-tissot-prx-t1374101109100.ts
 *   npx tsx scripts/import-tissot-prx-t1374101109100.ts --apply
 */
import { createHash } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { BOTTLE_SIZES, type BottleSize } from "../src/lib/bottle-sizes";
import { rebuildWatchDescriptionFromRecord } from "./lib/catalog-product-description";
import { downloadWatchImagesFromShopify } from "./lib/catalog-image-import";
import { createScriptPrisma } from "./lib/script-prisma";
import { defaultCatalogCostPriceGhs } from "./lib/catalog-cost";

const apply = process.argv.includes("--apply");

const PRODUCT_URL = "https://www.tissotwatches.com/en-en/T1374101109100.html";
const IMAGE_SOURCE_URL =
  "https://www.watchesofswitzerland.com/products/tissot-prx-t1374101109100-17361404.json";

const PRICE_GHS = 650;
const STOCK_PER_BRANCH = 1;

const BRAND = "Tissot";
const MODEL = "PRX 40mm Green Dial";
const REFERENCE = "T1374101109100";
const COLLECTION = "PRX";

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

type ShopifyImage = {
  src: string;
  position: number;
  alt: string | null;
};

async function fetchShopifyImages(jsonUrl: string): Promise<ShopifyImage[]> {
  const res = await fetch(jsonUrl, {
    headers: { "User-Agent": "CosyAuraCatalogImport/1.0" },
  });
  if (!res.ok) throw new Error(`Failed to fetch product JSON (${res.status})`);
  const data = (await res.json()) as { product: { images: ShopifyImage[] } };
  return data.product.images;
}

const LEAD = `The Tissot PRX 40mm in green dial pairs seventies-inspired integrated bracelet design with everyday Swiss quartz precision. A 40 mm 316L stainless steel case with brushed and polished surfaces flows into a matching steel bracelet with butterfly clasp for a sleek, wrist-hugging profile.

Scratch-resistant sapphire crystal protects a deep green dial with index markers and Super-LumiNova hands. Swiss quartz three-hand movement with date keeps time reliably, while 100 metres of water resistance and quick-release bracelet compatibility make the PRX an easy daily wear. Swiss made with two-year warranty.`;

function buildDescription(): string {
  return rebuildWatchDescriptionFromRecord({
    model: MODEL,
    reference: REFERENCE,
    category: "Classic Watches",
    collection: COLLECTION,
    bottleDetail:
      "40 mm stainless steel · 10.4 mm thick · sapphire crystal · 100 m WR",
    liquidColor: "Green dial · Super-LumiNova hands",
    longevity: "Swiss quartz three-hand · date · EOL indicator",
    bottleSize: 40,
    condition: "UNWORN",
    lead: LEAD,
    legacyDescription: `Specifications
- Reference: T137.410.11.091.00 (${REFERENCE})
- Collection: PRX
- Case: 40 mm × 39.5 mm lug-to-lug × 10.4 mm, 316L stainless steel
- Dial: Green with index markers, date at 3 o'clock
- Crystal: Scratch-resistant sapphire
- Bracelet: Stainless steel with butterfly clasp and push-buttons
- Movement: Swiss quartz three-hand with EOL (battery end-of-life indicator)
- Water resistance: 100 metres (10 bar)
- Weight: 130 g
- Origin: Swiss made
- Warranty: 2-year manufacturer warranty`,
  });
}

const CONDITION_REPORT =
  "New Tissot PRX. 40 mm stainless steel case and bracelet, green dial, Swiss quartz movement. Sapphire crystal, Super-LumiNova hands, 100 m WR. Swiss made. Original box and papers.";

async function main() {
  console.log(apply ? "Importing watch…" : "Dry run — pass --apply to write");
  console.log(`Source: ${PRODUCT_URL}\n`);

  const productImages = await fetchShopifyImages(IMAGE_SOURCE_URL);
  const brandSlug = slugify(BRAND);
  const slug = slugify(`${brandSlug}-prx-${REFERENCE}`);

  console.log(`Brand: ${BRAND}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Reference: ${REFERENCE}`);
  console.log(`Slug: ${slug}`);
  console.log(`Price: ${PRICE_GHS} GHS`);
  console.log(`Images: ${productImages.length} product photos\n`);

  const imageUrls = await downloadWatchImagesFromShopify(productImages, slug, apply);

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
      where: { brandId_slug: { brandId: brand.id, slug: "prx" } },
      update: { name: "PRX" },
      create: { brandId: brand.id, name: "PRX", slug: "prx" },
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
      bottleMaterial: "GLASS" as const,
      bottleDetail:
        "40 mm stainless steel · 10.4 mm thick · sapphire crystal · 100 m WR",
      bottleSize: 40,
      capType: "MAGNETIC" as const,
      liquidColor: "Green dial · Super-LumiNova hands",
      longevity: "Swiss quartz three-hand · date · EOL indicator",
      bottleShape: "Integrated bracelet sport watch",
      concentration: "EDP" as const,
      topNotes: [] as string[],
      heartNotes: [] as string[],
      baseNotes: [] as string[],
      sillage: "MODERATE" as const,
      sustainabilityScore: 5,
      isVegan: false,
      isCrueltyFree: true,
      sampleAvailable: false,
      gender: "MENS" as const,
      collection: COLLECTION,
      stock: STOCK_PER_BRANCH * Math.max(branches.length, 1),
      rating: 4.8,
      featured: true,
      category: "Classic Watches",
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
