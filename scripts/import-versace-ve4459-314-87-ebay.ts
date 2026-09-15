/**
 * Import Versace VE4459 314/87 White/Dark Grey (eBay listing source)
 *
 * Usage:
 *   npx tsx scripts/import-versace-ve4459-314-87-ebay.ts
 *   npx tsx scripts/import-versace-ve4459-314-87-ebay.ts --apply
 */
import { createHash } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { BOTTLE_SIZES, type BottleSize } from "../src/lib/bottle-sizes";
import {
  descriptionSection,
  joinDescriptionSections,
  sanitizeDescriptionText,
} from "./lib/catalog-product-description";
import { downloadSunglassesImagesFromUrls } from "./lib/catalog-image-import";
import { createScriptPrisma } from "./lib/script-prisma";
import { defaultCatalogCostPriceGhs } from "./lib/catalog-cost";

const apply = process.argv.includes("--apply");

const LISTING_URL = "https://www.ebay.com/itm/386312559646";
const IMAGE_BASE =
  "https://www.otticait.com/media/catalog/product/v/e/versace-ve-4459-314-87";
const SOURCE_IMAGES = [
  `${IMAGE_BASE}.jpg`,
  `${IMAGE_BASE}-2.jpg`,
  `${IMAGE_BASE}-3.jpg`,
  `${IMAGE_BASE}-4.jpg`,
  `${IMAGE_BASE}-5.jpg`,
];

const PRICE_GHS = 300;
const STOCK_PER_BRANCH = 2;

const BRAND = "Versace";
const MODEL = "VE4459 White/Dark Grey";
const REFERENCE = "VE4459 314/87";
const COLLECTION = "Medusa";

const BARCODE_LEAD: Record<BottleSize, string> = { 30: "3", 50: "5", 100: "1" };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function productSlug(): string {
  return slugify(`${BRAND}-${MODEL}-${REFERENCE}`);
}

function buildDescription(): string {
  return sanitizeDescriptionText(
    joinDescriptionSections(
      "Crisp white acetate with dark grey lenses — a bold rectangular profile finished with Versace's restored Medusa emblem on the temples.",
      `Reference ${REFERENCE}. Lightweight full-rim rectangle sunglasses designed for everyday wear with a polished white-and-gold finish.`,
      descriptionSection("Frame", [
        "Colour: White with white/gold temples",
        "Material: Acetate",
        "Measurements: 54-18-140 mm",
        "Shape: Rectangle · Full rim",
      ]),
      descriptionSection("Lenses", [
        "Dark grey, non-polarised",
        "Category 3 · 100% UVA/UVB protection",
      ]),
      "Includes authentic Versace case and cleaning cloth. Condition: New, unworn."
    )
  );
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

async function importProduct(prisma: PrismaClient, imageUrls: string[]) {
  const slug = productSlug();
  const brandSlug = slugify(BRAND);

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
    productType: "SUNGLASSES" as const,
    brandId: brand.id,
    model: MODEL,
    reference: REFERENCE,
    description: buildDescription(),
    conditionReport: "New with case. Unworn. Authentic designer sunglasses.",
    price: PRICE_GHS,
    costPriceGhs: defaultCatalogCostPriceGhs("SUNGLASSES", 50),
    condition: "UNWORN" as const,
    year: 2026,
    fragranceFamily: "FRESH" as const,
    bottleMaterial: "ACRYLIC" as const,
    bottleDetail: "Acetate frame with Medusa temple detail",
    bottleSize: 54,
    capType: "SCREW" as const,
    liquidColor: "Dark grey lenses, Category 3, non-polarised",
    longevity: "100% UVA/UVB protection",
    bottleShape: "Rectangle",
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
    rating: 4.7,
    featured: false,
    category: "Designer",
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
        alt: `${BRAND} ${MODEL} sunglasses`,
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

  return { fragrance, slug };
}

async function main() {
  const slug = productSlug();

  console.log(
    apply
      ? "Importing Versace VE4459…"
      : "Dry run — Versace VE4459. Pass --apply to write.\n"
  );
  console.log(`Source listing: ${LISTING_URL}`);
  console.log(`Price: ${PRICE_GHS} GHS · Category: Designer`);
  console.log(`Slug: ${slug}`);
  console.log(`Images: ${SOURCE_IMAGES.length}`);
  for (const url of SOURCE_IMAGES) {
    console.log(`  · ${url}`);
  }

  if (!apply) {
    console.log("\nDry run complete. Re-run with --apply to persist.");
    return;
  }

  const { prisma, disconnect } = createScriptPrisma();

  try {
    const cloudUrls = await downloadSunglassesImagesFromUrls(
      SOURCE_IMAGES,
      slug,
      true
    );
    const { slug: savedSlug } = await importProduct(
      prisma,
      cloudUrls.filter(Boolean)
    );
    console.log(
      `\n✓ ${BRAND} ${MODEL} → /sunglasses/${savedSlug} (${cloudUrls.length} image(s))`
    );
  } finally {
    await disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
