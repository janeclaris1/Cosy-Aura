/**
 * Import Citizen Attesa AT8044-56E
 *
 * Usage:
 *   npx tsx scripts/import-citizen-attesa-at8044-56e-sakura.ts
 *   npx tsx scripts/import-citizen-attesa-at8044-56e-sakura.ts --apply
 */
import { createHash } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { BOTTLE_SIZES, type BottleSize } from "../src/lib/bottle-sizes";
import { rebuildWatchDescriptionFromRecord } from "./lib/catalog-product-description";
import { downloadWatchImagesFromUrls } from "./lib/catalog-image-import";
import { createScriptPrisma } from "./lib/script-prisma";
import { defaultCatalogCostPriceGhs } from "./lib/catalog-cost";

const apply = process.argv.includes("--apply");

const PRODUCT_URL = "https://www.sakurawatches.com/citizen-attesa-at8044-56e";

const PRICE_GHS = 805;
const STOCK_PER_BRANCH = 1;

const BRAND = "Citizen";
const MODEL = "Attesa AT8044-56E";
const REFERENCE = "AT8044-56E";
const COLLECTION = "Attesa";

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

async function fetchProductImageUrls(productUrl: string, reference: string): Promise<string[]> {
  const res = await fetch(productUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch product page (${res.status})`);

  const html = await res.text();
  const refSlug = reference.toLowerCase().replace(/\./g, "-");
  const seen = new Set<string>();
  const urls: string[] = [];
  const re =
    /\/image\/cache\/catalog\/watches\/7\/([^"'\s>]+?)(?:-\d+x\d+)?\.jpg/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const stem = match[1];
    if (!stem.includes(refSlug)) continue;
    if (seen.has(stem)) continue;
    seen.add(stem);
    urls.push(
      `https://www.sakurawatches.com/image/cache/catalog/watches/7/${stem}-1000x1000.jpg`
    );
  }

  if (!urls.length) {
    throw new Error("No product images found on listing page");
  }

  return urls;
}

const LEAD = `The Attesa AT8044-56E is a lightweight travel chronograph built around titanium with hard coating for everyday durability. Eco-Drive H804 runs on light with radio-controlled atomic sync, so the black analog dial stays accurate across time zones without battery changes.

At 43 mm and just 9.9 mm thick, the round case wears sleek for a full-featured watch. Sapphire crystal with super clear coating, luminous hands and markers, chronograph, perpetual calendar, world time, day/date, power reserve indicator, and antimagnetic protection make it a capable business and travel companion on a matching black titanium bracelet with 100 metres of water resistance.`;

function buildDescription(): string {
  return rebuildWatchDescriptionFromRecord({
    model: MODEL,
    reference: REFERENCE,
    category: "Sport Watches",
    collection: COLLECTION,
    bottleDetail:
      "43 mm titanium hard coating · 9.9 mm thick · sapphire super clear · 100 m WR",
    liquidColor: "Black analog dial · luminous hands and markers",
    longevity: "Eco-Drive H804 solar · radio controlled · antimagnetic",
    bottleSize: 43,
    condition: "UNWORN",
    lead: LEAD,
    legacyDescription: `Specifications
- Reference: ${REFERENCE}
- Collection: Attesa
- Case: 43 mm titanium with hard coating, 9.9 mm thick
- Dial: Black analog
- Crystal: Sapphire with super clear coating
- Bracelet: Black titanium with hard coating
- Movement: Eco-Drive H804 solar quartz, radio controlled
- Functions: Chronograph, perpetual calendar, world time, day/date, power reserve indicator
- Water resistance: 100 metres
- Included: Original box, papers, instruction manual`,
  });
}

const CONDITION_REPORT =
  "New watch. 43 mm titanium case and bracelet with hard coating. Black dial, Eco-Drive H804 radio-controlled movement. Sapphire crystal, 100 m WR. Original box and papers.";

async function main() {
  console.log(apply ? "Importing watch…" : "Dry run — pass --apply to write");
  console.log(`Source: ${PRODUCT_URL}\n`);

  const imageSourceUrls = await fetchProductImageUrls(PRODUCT_URL, REFERENCE);
  const brandSlug = slugify(BRAND);
  const slug = slugify(`${brandSlug}-attesa-${REFERENCE}`);

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
      where: { brandId_slug: { brandId: brand.id, slug: "attesa" } },
      update: { name: "Attesa" },
      create: { brandId: brand.id, name: "Attesa", slug: "attesa" },
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
        "43 mm titanium hard coating · 9.9 mm thick · sapphire super clear · 100 m WR",
      bottleSize: 43,
      capType: "MAGNETIC" as const,
      liquidColor: "Black analog dial · luminous hands and markers",
      longevity: "Eco-Drive H804 solar · radio controlled",
      bottleShape: "Round sport watch",
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
