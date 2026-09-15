/**
 * Import Audemars Piguet Royal Oak Frosted White Gold Chronograph 26240BC.GG.1324BC.01
 *
 * Usage:
 *   npx tsx scripts/import-audemars-piguet-royal-oak-26240bc-skydiamonds.ts
 *   npx tsx scripts/import-audemars-piguet-royal-oak-26240bc-skydiamonds.ts --apply
 */
import { createHash } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { BOTTLE_SIZES, type BottleSize } from "../src/lib/bottle-sizes";
import { rebuildWatchDescriptionFromRecord } from "./lib/catalog-product-description";
import { downloadWatchImagesFromShopify } from "./lib/catalog-image-import";
import { createScriptPrisma } from "./lib/script-prisma";
import { defaultCatalogCostPriceGhs } from "./lib/catalog-cost";

const apply = process.argv.includes("--apply");

const PRODUCT_URL =
  "https://skydiamondco.com/products/audemars-piguet-royal-oak-selfwinding-chronograph-26240bc-gg-1324bc-01";

const PRICE_GHS = 1300;
const STOCK_PER_BRANCH = 1;

const BRAND = "Audemars Piguet";
const MODEL = "Royal Oak Frosted White Gold Chronograph";
const REFERENCE = "26240BC.GG.1324BC.01";
const COLLECTION = "Royal Oak";

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

type ShopifyProduct = {
  title: string;
  vendor: string;
  body_html: string;
  variants: Array<{ sku: string; price: string }>;
  images: ShopifyImage[];
};

function isProductPhoto(img: ShopifyImage): boolean {
  const alt = (img.alt || "").toLowerCase();
  const src = img.src.toLowerCase();
  if (alt.includes("warranty") || alt.includes("garantie")) return false;
  if (src.includes("garantie") || src.includes("payment") || src.includes("seal")) return false;
  if (src.includes("/assets/") && !src.includes("/files/")) return false;
  return true;
}

const LEAD = `This 41 mm flyback chronograph pairs an 18 ct white gold case and integrated bracelet finished in Frosted Gold — a hammered texture that catches light without excess flash. The grey Grande Tapisserie dial is set with black chronograph counters, white gold applied hour markers, and luminescent Royal Oak hands for a crisp, legible layout.

Built for daily wear and serious timing, the self-winding calibre delivers flyback chronograph function, date, and small seconds with roughly 70 hours of power reserve. A Japan-market edition that balances iconic Royal Oak design with contemporary frosted white gold presence.`;

function buildDescription(): string {
  return rebuildWatchDescriptionFromRecord({
    model: MODEL,
    reference: REFERENCE,
    category: "Chronograph",
    collection: COLLECTION,
    bottleDetail:
      "41 mm 18 ct white gold · Frosted Gold bracelet · integrated case · 50 m WR",
    liquidColor: "Grey Grande Tapisserie · black counters",
    longevity: "Selfwinding flyback chronograph · ~70 h power reserve",
    bottleSize: 41,
    condition: "UNWORN",
    lead: LEAD,
    legacyDescription: `Specifications
- Reference: ${REFERENCE}
- Collection: Royal Oak
- Case: 41 mm, 18 ct white gold
- Dial: Grey Grande Tapisserie, black counters, luminescent hands
- Bracelet: Hammered 18 ct white gold Frosted Gold with folding clasp
- Functions: Flyback chronograph, hours, minutes, small seconds, date
- Movement: Selfwinding chronograph calibre
- Power reserve: ~70 hours
- Water resistance: 50 metres
- Included: Full manufacturer warranty`,
  });
}

const CONDITION_REPORT =
  "New chronograph. 41 mm frosted white gold case and bracelet. Grey Grande Tapisserie dial with black counters. Flyback chronograph calibre with ~70 h reserve. Full warranty. Complete set as supplied.";

async function fetchShopifyProduct(url: string): Promise<ShopifyProduct> {
  const jsonUrl = url.replace(/\/?(\?.*)?$/, ".json");
  const res = await fetch(jsonUrl, {
    headers: { "User-Agent": "CosyAuraCatalogImport/1.0" },
  });
  if (!res.ok) throw new Error(`Failed to fetch product JSON (${res.status})`);
  const data = (await res.json()) as { product: ShopifyProduct };
  return data.product;
}

async function main() {
  console.log(apply ? "Importing watch…" : "Dry run — pass --apply to write");
  console.log(`Source: ${PRODUCT_URL}\n`);

  const product = await fetchShopifyProduct(PRODUCT_URL);
  const brandSlug = slugify(BRAND);
  const slug = slugify(`${brandSlug}-royal-oak-frosted-white-gold-chronograph-${REFERENCE}`);
  const productImages = product.images.filter(isProductPhoto);

  console.log(`Brand: ${BRAND}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Reference: ${REFERENCE}`);
  console.log(`Slug: ${slug}`);
  console.log(`Price: ${PRICE_GHS} GHS`);
  console.log(`Source USD: $${product.variants[0]?.price ?? "—"}`);
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
        "41 mm 18 ct white gold · Frosted Gold bracelet · integrated case · 50 m WR",
      bottleSize: 41,
      capType: "MAGNETIC" as const,
      liquidColor: "Grey Grande Tapisserie · black counters",
      longevity: "Flyback chronograph · ~70 h power reserve",
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
      gender: "MENS" as const,
      collection: COLLECTION,
      stock: STOCK_PER_BRANCH * Math.max(branches.length, 1),
      rating: 4.9,
      featured: true,
      category: "Chronograph",
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
