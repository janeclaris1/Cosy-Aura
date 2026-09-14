/**
 * Import Pre-Owned Patek Philippe Aquanaut Travel Time 5164A-001 (Walmart listing).
 *
 * Usage:
 *   npx tsx scripts/import-patek-aquanaut-5164a-walmart.ts
 *   npx tsx scripts/import-patek-aquanaut-5164a-walmart.ts --apply
 */
import { createHash } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { BOTTLE_SIZES, type BottleSize } from "../src/lib/bottle-sizes";
import { downloadWatchImagesFromUrls } from "./lib/catalog-image-import";
import { createScriptPrisma } from "./lib/script-prisma";

const apply = process.argv.includes("--apply");

const PRODUCT_URL =
  "https://www.walmart.com/ip/Pre-Owned-Patek-Philippe-Aquanaut-Travel-Time-5164A-001-Stainless-Steel-with-Orange-Rubber-Strap/16436556943";

const PRICE_GHS = 1700;
const STOCK_PER_BRANCH = 1;

const BRAND = "Patek Philippe";
const MODEL = "Aquanaut Travel Time 5164A Orange Strap";
const REFERENCE = "5164A-001";
const COLLECTION = "Aquanaut";

const DESCRIPTION = `Pre-owned Patek Philippe Aquanaut Travel Time reference 5164A-001 in stainless steel with a bold orange rubber strap.

This dual-time complication lets you track home and local time at a glance, with day/night indicators for both zones. The embossed black dial carries the signature Aquanaut grid pattern, paired with a sporty integrated rubber strap in vivid orange.

**Specifications**
- Reference: 5164A-001
- Collection: Aquanaut Travel Time
- Case: 40.8 mm, stainless steel
- Dial: Black embossed grid with dual-time and day/night displays
- Bracelet: Orange rubber with stainless steel fold-over clasp
- Movement: Self-winding travel time calibre
- Water resistance: 120 metres
- Condition: Pre-owned, professionally inspected`;

const CONDITION_REPORT = `Pre-owned luxury sports watch. Stainless steel case. Travel time complication. Orange rubber strap with steel deployant. Inspected and ready for sale.`;

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

async function fetchWalmartImageUrls(url: string): Promise<string[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch Walmart page (${res.status})`);

  const html = await res.text();
  const matches = html.matchAll(
    /https:\/\/i5\.walmartimages\.com\/asr\/[a-f0-9-]+\.[a-f0-9]+\.(?:png|jpe?g)/gi
  );
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const match of matches) {
    const src = match[0].split("?")[0];
    if (seen.has(src)) continue;
    seen.add(src);
    urls.push(src);
  }
  const productImages = urls.filter(
    (u) => !u.includes("6bcfaba1-2dda-4d62-b7c6-648c3745d960")
  );
  if (!productImages.length) throw new Error("No product images found on Walmart page");
  return productImages;
}

async function main() {
  console.log(apply ? "Importing watch…" : "Dry run — pass --apply to write");
  console.log(`Source: ${PRODUCT_URL}\n`);

  const brandSlug = slugify(BRAND);
  const slug = slugify(`${brandSlug}-${MODEL}-${REFERENCE}`);

  console.log(`Brand: ${BRAND}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Reference: ${REFERENCE}`);
  console.log(`Slug: ${slug}`);
  console.log(`Price: ${PRICE_GHS} GHS\n`);

  const imageUrls = await fetchWalmartImageUrls(PRODUCT_URL);
  console.log(`Found ${imageUrls.length} images on Walmart\n`);

  const localPaths = await downloadWatchImagesFromUrls(imageUrls, slug, apply);

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

    const data = {
      productType: "WATCH" as const,
      brandId: brand.id,
      model: MODEL,
      reference: REFERENCE,
      description: DESCRIPTION,
      conditionReport: CONDITION_REPORT,
      price: PRICE_GHS,
      costPriceGhs: 0,
      condition: "EXCELLENT" as const,
      year: 2021,
      fragranceFamily: "FRESH" as const,
      bottleMaterial: "METAL" as const,
      bottleDetail: "40.8 mm steel · travel time · orange rubber · 120 m WR",
      bottleSize: 50,
      capType: "MAGNETIC" as const,
      liquidColor: "Black",
      longevity: "Power reserve per manufacture spec",
      bottleShape: "Round sports",
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
      category: "Sport watch",
    };

    const existing = await prisma.fragrance.findUnique({ where: { slug } });
    const fragrance = existing
      ? await prisma.fragrance.update({ where: { slug }, data })
      : await prisma.fragrance.create({ data: { ...data, slug } });

    await prisma.fragranceImage.deleteMany({ where: { fragranceId: fragrance.id } });
    if (localPaths.length) {
      await prisma.fragranceImage.createMany({
        data: localPaths.map((url, i) => ({
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
  } finally {
    await disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
