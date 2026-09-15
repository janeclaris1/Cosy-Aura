/**
 * Import Casio G-Shock GW-M5610U-2JF Multiband 6 (eBay listing source)
 *
 * Usage:
 *   npx tsx scripts/import-casio-g-shock-gw-m5610u-2jf-ebay.ts
 *   npx tsx scripts/import-casio-g-shock-gw-m5610u-2jf-ebay.ts --apply
 */
import { createHash } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { BOTTLE_SIZES, type BottleSize } from "../src/lib/bottle-sizes";
import { rebuildWatchDescriptionFromRecord } from "./lib/catalog-product-description";
import { downloadWatchImagesFromShopify } from "./lib/catalog-image-import";
import { createScriptPrisma } from "./lib/script-prisma";
import { defaultCatalogCostPriceGhs } from "./lib/catalog-cost";

const apply = process.argv.includes("--apply");

const LISTING_URL = "https://www.ebay.com/itm/306673906603";
const IMAGE_SOURCE_URL =
  "https://shop.theclockhouse.jp/products/gw-m5610u-2jf.json";

const PRICE_GHS = 700;
const STOCK_PER_BRANCH = 1;

const BRAND = "Casio";
const MODEL = "G-Shock GW-M5610U-2JF Multiband 6";
const REFERENCE = "GW-M5610U-2JF";
const COLLECTION = "G-Shock";

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

const LEAD = `The GW-M5610U-2JF is the classic square G-Shock Origin updated with Multiband 6 radio sync and Tough Solar charging. A 43.2 mm resin case keeps the iconic digital silhouette light and shock resistant, finished in navy with a matching resin strap.

Solar power eliminates battery changes while atomic timekeeping keeps the LCD display aligned across global radio zones. World time, 1/100-second stopwatch, countdown timer, five alarms, perpetual calendar, and power reserve indicator cover daily utility. Two hundred metres of water resistance and mineral glass complete a made-in-Japan tool watch built for travel and everyday wear.`;

function buildDescription(): string {
  return rebuildWatchDescriptionFromRecord({
    model: MODEL,
    reference: REFERENCE,
    category: "Sport Watches",
    collection: COLLECTION,
    bottleDetail:
      "43.2 mm resin case · 12.7 mm thick · mineral glass · 200 m WR",
    liquidColor: "Navy resin · negative LCD digital display",
    longevity: "Tough Solar · Multiband 6 radio · module 3495",
    bottleSize: 43,
    condition: "UNWORN",
    lead: LEAD,
    legacyDescription: `Specifications
- Reference: ${REFERENCE}
- Collection: G-Shock Origin
- Case: 43.2 × 50.8 × 12.7 mm resin, shock resistant
- Display: Negative LCD digital
- Crystal: Mineral glass
- Strap: Navy resin band
- Movement: Solar quartz, module 3495 (Multiband 6)
- Functions: World time, stopwatch, countdown timer, alarms, perpetual calendar, power reserve, EL backlight
- Water resistance: 200 metres (20 bar)
- Origin: Made in Japan
- Included: Original box, instruction manual, warranty card`,
  });
}

const CONDITION_REPORT =
  "New G-Shock. Navy resin case and strap, negative LCD digital display. Tough Solar Multiband 6 movement, mineral crystal, 200 m WR. Made in Japan. Original box and papers.";

async function main() {
  console.log(apply ? "Importing watch…" : "Dry run — pass --apply to write");
  console.log(`Listing: ${LISTING_URL}\n`);

  const productImages = await fetchShopifyImages(IMAGE_SOURCE_URL);
  const brandSlug = slugify(BRAND);
  const slug = slugify(`${brandSlug}-g-shock-${REFERENCE}`);

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
      where: { brandId_slug: { brandId: brand.id, slug: "g-shock" } },
      update: { name: "G-Shock" },
      create: { brandId: brand.id, name: "G-Shock", slug: "g-shock" },
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
      bottleMaterial: "ACRYLIC" as const,
      bottleDetail:
        "43.2 mm resin case · 12.7 mm thick · mineral glass · 200 m WR",
      bottleSize: 43,
      capType: "MAGNETIC" as const,
      liquidColor: "Navy resin · negative LCD digital display",
      longevity: "Tough Solar · Multiband 6 radio · module 3495",
      bottleShape: "Square digital sport watch",
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
      rating: 4.7,
      featured: true,
      category: "Sport Watches",
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
