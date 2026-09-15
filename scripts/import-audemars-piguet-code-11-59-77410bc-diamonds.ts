/**
 * Import Audemars Piguet Code 11.59 77410BC.ZZ.D132CR.01 White Gold Diamonds
 *
 * Source: https://firstclasstimepieces.com/products/audemars-piguet-code-11-59-77410bc-zz-d132cr-01-18k-white-gold-diamonds
 *
 * Usage:
 *   npx tsx scripts/import-audemars-piguet-code-11-59-77410bc-diamonds.ts
 *   npx tsx scripts/import-audemars-piguet-code-11-59-77410bc-diamonds.ts --apply
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
  "https://firstclasstimepieces.com/products/audemars-piguet-code-11-59-77410bc-zz-d132cr-01-18k-white-gold-diamonds";

const PRICE_GHS = 1350;
const STOCK_PER_BRANCH = 1;

const BRAND = "Audemars Piguet";
const MODEL = "Code 11.59 White Gold Diamond";
const REFERENCE = "77410BC.ZZ.D132CR.01";
const COLLECTION = "Code 11.59";

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
  body_html: string;
  variants: Array<{ price: string }>;
  images: ShopifyImage[];
};

async function fetchShopifyProduct(url: string): Promise<ShopifyProduct> {
  const jsonUrl = url.replace(/\/?(\?.*)?$/, ".json");
  const res = await fetch(jsonUrl, {
    headers: { "User-Agent": "CosyAuraCatalogImport/1.0" },
  });
  if (!res.ok) throw new Error(`Failed to fetch product JSON (${res.status})`);
  const data = (await res.json()) as { product: ShopifyProduct };
  return data.product;
}

const LEAD = `The Code 11.59 by Audemars Piguet in 18 ct white gold brings a refined dress-watch presence with a diamond-set dial and sculpted case architecture. At 38 mm, the double-curved crystal and layered case design create depth while staying elegant on the wrist.

Calibre 5900 automatic delivers hours, minutes, seconds, and date with a 60-hour power reserve. A grey leather strap with folding clasp complements the white gold case and diamond dial. Sapphire crystal, 30 metres water resistance, and Swiss finishing complete a contemporary AP dress piece with original box and warranty.`;

function buildDescription(): string {
  return rebuildWatchDescriptionFromRecord({
    model: MODEL,
    reference: REFERENCE,
    category: "Dress Watches",
    collection: COLLECTION,
    bottleDetail:
      "38 mm 18 ct white gold · sapphire crystal · diamond dial · 30 m WR",
    liquidColor: "Diamond-set dial · no numerals",
    longevity: "Calibre 5900 automatic · 60-hour power reserve",
    bottleSize: 38,
    condition: "UNWORN",
    lead: LEAD,
    legacyDescription: `Specifications
- Reference: ${REFERENCE}
- Collection: Code 11.59
- Case: 38 mm, 18 ct white gold
- Dial: Diamond-set, no numerals
- Crystal: Sapphire
- Bezel: 18 ct white gold
- Strap: Grey leather with fold clasp
- Movement: Automatic calibre 5900
- Power reserve: 60 hours
- Water resistance: 30 metres
- Condition: Like new / unworn with box and papers`,
  });
}

const CONDITION_REPORT =
  "Like-new Code 11.59. 38 mm white gold case, diamond dial, grey leather strap. Calibre 5900 automatic with 60-hour reserve. Sapphire crystal, 30 m WR. Original box and warranty included.";

async function main() {
  console.log(apply ? "Importing watch…" : "Dry run — pass --apply to write");
  console.log(`Source: ${PRODUCT_URL}\n`);

  const product = await fetchShopifyProduct(PRODUCT_URL);
  const brandSlug = slugify(BRAND);
  const slug = slugify(`${brandSlug}-code-11-59-white-gold-diamond-${REFERENCE}`);

  console.log(`Brand: ${BRAND}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Reference: ${REFERENCE}`);
  console.log(`Slug: ${slug}`);
  console.log(`Price: ${PRICE_GHS} GHS`);
  console.log(`Source USD: $${product.variants[0]?.price ?? "—"}`);
  console.log(`Images: ${product.images.length} product photos\n`);

  const imageUrls = await downloadWatchImagesFromShopify(product.images, slug, apply);

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
      where: { brandId_slug: { brandId: brand.id, slug: "code-11-59" } },
      update: { name: "Code 11.59" },
      create: { brandId: brand.id, name: "Code 11.59", slug: "code-11-59" },
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
        "38 mm 18 ct white gold · sapphire crystal · diamond dial · 30 m WR",
      bottleSize: 38,
      capType: "MAGNETIC" as const,
      liquidColor: "Diamond-set dial · no numerals",
      longevity: "Calibre 5900 automatic · 60-hour power reserve",
      bottleShape: "Code 11.59 round case",
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
