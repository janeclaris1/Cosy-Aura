/**
 * Import / re-import Rolex Daytona 116518LN (Shopify source).
 *
 * Usage:
 *   npx tsx scripts/import-rolex-daytona-116518ln-walmart.ts
 *   npx tsx scripts/import-rolex-daytona-116518ln-walmart.ts --apply
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
  "https://wristaficionado.com/collections/rolex-daytona/products/rolex-daytona-116518ln-paul-newman-yellow-gold-black-dial-2018";

const PRICE_GHS = 1900;
const STOCK_PER_BRANCH = 1;

const BRAND = "Rolex";
const MODEL = "Daytona Yellow Gold Champagne Dial";
const REFERENCE = "116518LN";
const COLLECTION = "Daytona";
const YEAR = 2017;

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
  if (alt.includes("warranty") || alt.includes("garantie")) return false;
  if (img.src.toLowerCase().includes("garantie")) return false;
  return true;
}

const LEAD = `The Cosmograph Daytona 116518LN pairs 18 ct yellow gold with a black lacquer dial and contrasting champagne subdials — a sharp panda chronograph layout built for the track. A black Cerachrom tachymeter bezel and black Oysterflex strap keep the look modern and sporting.

Gold pushers, a screw-down crown, and applied gold hour markers complete the case. Caliber 4130 delivers self-winding chronograph precision with roughly 72 hours of power reserve. A pre-owned icon that wears its racing heritage with unmistakable warmth.`;

function buildDescription(): string {
  return rebuildWatchDescriptionFromRecord({
    model: MODEL,
    reference: REFERENCE,
    category: "Chronograph",
    collection: COLLECTION,
    bottleDetail:
      "40 mm 18 ct yellow gold · black Cerachrom bezel · black Oysterflex · 100 m WR",
    liquidColor: "Black dial · champagne subdials",
    longevity: "Caliber 4130 automatic chronograph · ~72 h power reserve",
    bottleSize: 40,
    condition: "EXCELLENT",
    lead: LEAD,
    legacyDescription: `Specifications
- Reference: ${REFERENCE}
- Collection: Cosmograph Daytona
- Case: 40 mm, 18 ct yellow gold
- Bezel: Black monobloc Cerachrom with tachymeter scale
- Dial: Black lacquer with champagne chronograph subdials
- Bracelet: Black Oysterflex with yellow gold deployant
- Movement: Caliber 4130 self-winding chronograph
- Water resistance: 100 metres
- Year: ${YEAR}
- Included: Original box and papers`,
  });
}

const CONDITION_REPORT =
  "Pre-owned chronograph in excellent condition. 40 mm yellow gold case, black Cerachrom bezel, black dial with champagne subdials. Black Oysterflex strap. Caliber 4130. Original box and papers. Carefully inspected before listing.";

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
  const slug = slugify(`${brandSlug}-${MODEL}-${REFERENCE}`);
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

    const description = buildDescription();

    const data = {
      productType: "WATCH" as const,
      brandId: brand.id,
      model: MODEL,
      reference: REFERENCE,
      description,
      conditionReport: CONDITION_REPORT,
      price: PRICE_GHS,
      costPriceGhs: defaultCatalogCostPriceGhs("WATCH", data.bottleSize ?? 50),
      condition: "EXCELLENT" as const,
      year: YEAR,
      fragranceFamily: "WOODY" as const,
      bottleMaterial: "METAL" as const,
      bottleDetail:
        "40 mm 18 ct yellow gold · black Cerachrom bezel · black Oysterflex · 100 m WR",
      bottleSize: 40,
      capType: "MAGNETIC" as const,
      liquidColor: "Black dial · champagne subdials",
      longevity: "Caliber 4130 · ~72 h power reserve",
      bottleShape: "Round chronograph",
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
