/**
 * Import Citizen Promaster Skyhawk A-T Blue Angels JY8125-54L
 *
 * Usage:
 *   npx tsx scripts/import-citizen-jy8125-54l.ts
 *   npx tsx scripts/import-citizen-jy8125-54l.ts --apply
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
  "https://www.citizenwatch.com/ca/en/product/JY8125-54L.html";

const PRICE_GHS = 750;
const STOCK_PER_BRANCH = 1;
const GALLERY_IMAGE_COUNT = 7;

const BRAND = "Citizen";
const MODEL = "Promaster Skyhawk A-T Blue Angels";
const REFERENCE = "JY8125-54L";
const COLLECTION = "Promaster";

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

async function fetchCitizenProductImageUrls(
  productUrl: string,
  sku: string,
  maxImages: number
): Promise<string[]> {
  const res = await fetch(productUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch product page (${res.status})`);

  const html = await res.text();
  const assetIds: string[] = [];
  const re = /citizenwatch\.widen\.net\/content\/([a-z0-9]+)\//gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const id = match[1];
    if (!assetIds.includes(id)) assetIds.push(id);
  }

  if (!assetIds.length) {
    throw new Error("No product images found on Citizen product page");
  }

  return assetIds.slice(0, maxImages).map(
    (id, index) =>
      `https://citizenwatch.widen.net/content/${id}/jpeg/${sku}-${index + 1}.jpg`
  );
}

const LEAD = `The Promaster Skyhawk A-T JY8125-54L is a high-performance pilot watch tuned for global travel and precision timing. Eco-Drive U680 runs on light alone while atomic timekeeping syncs to 43 world cities for set-and-forget accuracy.

A 46 mm two-tone stainless steel case combines a blue ion-plated bezel with a yellow inner ring and blue dial under sapphire crystal. The ana-digi layout packs a 1/100-second chronograph to 24 hours, perpetual calendar, dual time, two alarms, countdown timer, UTC display, digital backlight, and power reserve indicator. Blue Angels insignia on the caseback and 200 metres of water resistance complete the package.`;

function buildDescription(): string {
  return rebuildWatchDescriptionFromRecord({
    model: MODEL,
    reference: REFERENCE,
    category: "Sport Watches",
    collection: COLLECTION,
    bottleDetail:
      "46 mm two-tone steel · blue ion-plated bezel · sapphire crystal · 200 m WR",
    liquidColor: "Blue dial · luminous hands and markers",
    longevity: "Eco-Drive U680 atomic · light-powered · no battery changes",
    bottleSize: 46,
    condition: "UNWORN",
    lead: LEAD,
    legacyDescription: `Specifications
- Reference: ${REFERENCE}
- Collection: Promaster Skyhawk A-T / Blue Angels
- Case: 46 mm two-tone stainless steel, blue ion-plated bezel
- Dial: Blue with yellow inner bezel ring, luminous hands and markers
- Crystal: Sapphire
- Bracelet: Stainless steel fold-over clasp with hidden push button
- Movement: Eco-Drive U680 with atomic timekeeping
- Functions: 43 world cities, 1/100-second chronograph, perpetual calendar, dual time, 2 alarms, countdown timer, UTC, power reserve
- Water resistance: 200 metres
- Warranty: 5-year limited manufacturer warranty`,
  });
}

const CONDITION_REPORT =
  "New sport watch. 46 mm two-tone steel case, blue dial, Eco-Drive U680 atomic movement. Steel bracelet, sapphire crystal, 200 m WR. Blue Angels caseback detail. Full manufacturer warranty.";

async function main() {
  console.log(apply ? "Importing watch…" : "Dry run — pass --apply to write");
  console.log(`Source: ${PRODUCT_URL}\n`);

  const imageSourceUrls = await fetchCitizenProductImageUrls(
    PRODUCT_URL,
    REFERENCE,
    GALLERY_IMAGE_COUNT
  );
  const brandSlug = slugify(BRAND);
  const slug = slugify(`${brandSlug}-promaster-skyhawk-a-t-${REFERENCE}`);

  console.log(`Brand: ${BRAND}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Reference: ${REFERENCE}`);
  console.log(`Slug: ${slug}`);
  console.log(`Price: ${PRICE_GHS} GHS`);
  console.log(`Images: ${imageSourceUrls.length} product photos\n`);

  const imageUrls = await downloadWatchImagesFromUrls(imageSourceUrls, slug, apply);

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
      where: { brandId_slug: { brandId: brand.id, slug: "promaster" } },
      update: { name: "Promaster" },
      create: { brandId: brand.id, name: "Promaster", slug: "promaster" },
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
        "46 mm two-tone steel · blue ion-plated bezel · sapphire crystal · 200 m WR",
      bottleSize: 46,
      capType: "MAGNETIC" as const,
      liquidColor: "Blue dial · luminous hands and markers",
      longevity: "Eco-Drive U680 atomic · light-powered",
      bottleShape: "Round sport chronograph",
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
