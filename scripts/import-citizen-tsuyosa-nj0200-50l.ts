/**
 * Import Citizen Tsuyosa 37mm Ice Blue NJ0200-50L
 *
 * Usage:
 *   npx tsx scripts/import-citizen-tsuyosa-nj0200-50l.ts
 *   npx tsx scripts/import-citizen-tsuyosa-nj0200-50l.ts --apply
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
  "https://www.citizenwatch.com/ca/en/product/NJ0200-50L.html";

const PRICE_GHS = 680;
const STOCK_PER_BRANCH = 1;

const BRAND = "Citizen";
const MODEL = "Tsuyosa 37mm Ice Blue";
const REFERENCE = "NJ0200-50L";
const COLLECTION = "Tsuyosa";

const GALLERY_IMAGE_COUNT = 7;

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

const LEAD = `The Tsuyosa NJ0200-50L brings integrated-bracelet sport styling to a versatile 37 mm footprint. A silver-tone stainless steel case flows seamlessly into a matching link bracelet for a refined, modern silhouette that wears easily from office to weekend.

Under anti-reflective sapphire crystal, a sunray ice blue dial pairs silver-tone hands and indices with a 3 o'clock date window. Calibre 8210 automatic delivers a 42-hour power reserve with hacking seconds for precise time setting. Fifty metres of water resistance and luminous markers make it a capable everyday mechanical choice.`;

function buildDescription(): string {
  return rebuildWatchDescriptionFromRecord({
    model: MODEL,
    reference: REFERENCE,
    category: "Sport Watches",
    collection: COLLECTION,
    bottleDetail:
      "37 mm stainless steel · integrated bracelet · sapphire crystal · 50 m WR",
    liquidColor: "Ice blue sunray dial · silver-tone details",
    longevity: "Calibre 8210 automatic · 42-hour power reserve · hack feature",
    bottleSize: 37,
    condition: "UNWORN",
    lead: LEAD,
    legacyDescription: `Specifications
- Reference: ${REFERENCE}
- Collection: Tsuyosa
- Case: 37 mm silver-tone stainless steel, 9 mm lug width
- Dial: Ice blue sunray with date at 3 o'clock
- Crystal: Anti-reflective sapphire
- Bracelet: Stainless steel integrated bracelet, fold-over clasp with push button
- Movement: Calibre 8210 automatic, 42-hour power reserve, hacking seconds
- Water resistance: 50 metres (5 bar)
- Weight: 108 g
- Warranty: 5-year limited manufacturer warranty`,
  });
}

const CONDITION_REPORT =
  "New automatic watch. 37 mm stainless steel case and integrated bracelet. Ice blue sunray dial, Calibre 8210 movement with 42-hour reserve. Sapphire crystal, 50 m WR. Full manufacturer warranty.";

async function main() {
  console.log(apply ? "Importing watch…" : "Dry run — pass --apply to write");
  console.log(`Source: ${PRODUCT_URL}\n`);

  const imageSourceUrls = await fetchCitizenProductImageUrls(
    PRODUCT_URL,
    REFERENCE,
    GALLERY_IMAGE_COUNT
  );
  const brandSlug = slugify(BRAND);
  const slug = slugify(`${brandSlug}-tsuyosa-${REFERENCE}`);

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
      where: { brandId_slug: { brandId: brand.id, slug: "tsuyosa" } },
      update: { name: "Tsuyosa" },
      create: { brandId: brand.id, name: "Tsuyosa", slug: "tsuyosa" },
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
        "37 mm stainless steel · integrated bracelet · sapphire crystal · 50 m WR",
      bottleSize: 37,
      capType: "MAGNETIC" as const,
      liquidColor: "Ice blue sunray dial · silver-tone details",
      longevity: "Calibre 8210 automatic · 42-hour power reserve",
      bottleShape: "Round integrated-bracelet sport watch",
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
      rating: 4.6,
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
