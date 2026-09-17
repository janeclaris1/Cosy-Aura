/**
 * Import Pequignet Royale Paris Green Dial 36 mm from Shopify showroom.
 *
 * Usage:
 *   npx tsx scripts/import-pequignet-royale-paris.ts
 *   npx tsx scripts/import-pequignet-royale-paris.ts --apply
 */
import { createHash } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { BOTTLE_SIZES, type BottleSize } from "../src/lib/bottle-sizes";
import { downloadWatchImagesFromShopify } from "./lib/catalog-image-import";
import { createScriptPrisma } from "./lib/script-prisma";

const apply = process.argv.includes("--apply");

const PRODUCT_URL =
  "https://showroom.pequignet.com/en/products/montre-royale-paris-cadran-vert-36-mm";

/** Boutique GHS price (3500 EUR MSRP → local listing). */
const PRICE_GHS = 4200;
const STOCK_PER_BRANCH = 1;

const BARCODE_LEAD: Record<BottleSize, string> = { 30: "3", 50: "5", 100: "1" };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

type ShopifyVariant = {
  title: string;
  sku: string;
  option1: string | null;
  option2: string | null;
  price: string;
  image_id: number | null;
};

type ShopifyImage = {
  id: number;
  src: string;
  position: number;
  alt: string | null;
  variant_ids: number[];
};

type ShopifyProduct = {
  title: string;
  vendor: string;
  handle: string;
  body_html: string;
  tags: string;
  variants: ShopifyVariant[];
  options: Array<{ name: string; values: string[] }>;
  images: ShopifyImage[];
};

function isProductPhoto(img: ShopifyImage): boolean {
  const alt = (img.alt || "").toLowerCase();
  if (alt.includes("lang:")) return false;
  if (alt.includes("garantie") || alt.includes("warranty")) return false;
  if (img.src.toLowerCase().includes("garantie")) return false;
  return true;
}

function buildDescription(product: ShopifyProduct, reference: string): string {
  const intro = stripHtml(product.body_html);

  const variantLines = product.variants.map((v) => {
    const strap = [v.option1, v.option2].filter(Boolean).join(" · ");
    return `- ${strap}`;
  });

  return `${intro}

**Strap options** (configure at checkout)
${variantLines.join("\n")}

**Technical characteristics**
- Reference: ${reference}
- Collection: Royale Paris
- Case: 36 mm, 316L stainless steel, polished and satin finish
- Thickness: 8.95 mm
- Crystal: Domed anti-reflective sapphire glass box
- Dial: Green sunray with gouge surround
- Hands: Polished steel with Super-LumiNova TC1 (blue) on hour and minute
- Movement: Calibre Initial® automatic, 4 Hz, 65-hour power reserve
- Water resistance: 5 ATM (50 m)
- Caseback: Sapphire exhibition secured with 6 screws
- Lug width: 18 mm
- Clasp: Satin-finish steel ardillon buckle
- Strap: Quick-change leather system

**Warranty**
Pequignet manufacture movement — up to 5 years from date of purchase.`;
}

const CONDITION_REPORT =
  "New manufacture watch. French Calibre Initial® movement. Green sunray dial, 36 mm steel case, 5 ATM. Quick-change leather strap — Nubuck light brown or Taupe available.";

async function fetchShopifyProduct(url: string): Promise<ShopifyProduct> {
  const jsonUrl = url.replace(/\/?$/, ".json");
  const res = await fetch(jsonUrl, {
    headers: { "User-Agent": "CosyAuraCatalogImport/1.0" },
  });
  if (!res.ok) throw new Error(`Failed to fetch product JSON (${res.status})`);
  const data = (await res.json()) as { product: ShopifyProduct };
  return data.product;
}

async function main() {
  console.log(apply ? "Importing Pequignet watch…" : "Dry run — pass --apply to write");
  console.log(`Source: ${PRODUCT_URL}\n`);

  const product = await fetchShopifyProduct(PRODUCT_URL);
  const brandName = product.vendor.trim() || "Pequignet";
  const brandSlug = slugify(brandName);
  const model = "Royale Paris Green Dial 36 mm";
  const reference = product.variants[0]?.sku?.trim() || "9106393";
  const slug = slugify(`${brandSlug}-royale-paris-green-dial-36mm-${reference}`);
  const productImages = product.images.filter(isProductPhoto);

  console.log(`Brand: ${brandName}`);
  console.log(`Model: ${model}`);
  console.log(`Reference: ${reference}`);
  console.log(`Slug: ${slug}`);
  console.log(`Price: ${PRICE_GHS} GHS`);
  console.log(`Variants: ${product.variants.length}`);
  for (const v of product.variants) {
    console.log(`  · ${v.title} (${v.price} EUR)`);
  }
  console.log(`Images: ${productImages.length} product photos (${product.images.length} total)\n`);

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
      update: { name: brandName },
      create: { name: brandName, slug: brandSlug },
    });

    const series = await prisma.series.upsert({
      where: { brandId_slug: { brandId: brand.id, slug: "royale-paris" } },
      update: { name: "Royale Paris" },
      create: { brandId: brand.id, name: "Royale Paris", slug: "royale-paris" },
    });

    const description = buildDescription(product, reference);

    const data = {
      productType: "WATCH" as const,
      brandId: brand.id,
      seriesId: series.id,
      model,
      reference,
      description,
      conditionReport: CONDITION_REPORT,
      price: PRICE_GHS,
      costPriceGhs: 0,
      condition: "UNWORN" as const,
      year: 2026,
      fragranceFamily: "WOODY" as const,
      bottleMaterial: "METAL" as const,
      bottleDetail:
        "36 mm stainless steel · sapphire glass box crystal · 5 ATM · 18 mm lugs",
      bottleSize: 36,
      capType: "MAGNETIC" as const,
      liquidColor: "Green sunray dial",
      longevity: "Calibre Initial® · 65 h power reserve · -4/+6 s/day",
      bottleShape: "Round dress watch",
      concentration: "EDP" as const,
      topNotes: [] as string[],
      heartNotes: [] as string[],
      baseNotes: [] as string[],
      sillage: "MODERATE" as const,
      sustainabilityScore: 4,
      isVegan: false,
      isCrueltyFree: true,
      sampleAvailable: false,
      gender: "UNISEX" as const,
      collection: "Royale Paris",
      stock: STOCK_PER_BRANCH * Math.max(branches.length, 1),
      rating: 4.9,
      featured: true,
      category: "Dress watch",
    };

    const existing = await prisma.fragrance.findUnique({ where: { slug } });
    let fragrance;
    if (existing) {
      fragrance = await prisma.fragrance.update({ where: { slug }, data });
    } else {
      fragrance = await prisma.fragrance.create({ data: { slug, ...data } });
    }

    await prisma.fragranceImage.deleteMany({ where: { fragranceId: fragrance.id } });
    if (imageUrls.length) {
      await prisma.fragranceImage.createMany({
        data: imageUrls.map((url, i) => ({
          fragranceId: fragrance.id,
          url,
          alt: `${brandName} ${model} luxury watch`,
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

    console.log(`\n✓ Imported ${brandName} ${model}`);
    console.log(`  Product page: /watches/${slug}`);

    console.log(`  Admin: /admin/fragrances/${fragrance.id}/edit`);
    console.log(`  Strap variants: ${product.variants.map((v) => v.option2).join(", ")}`);
  } finally {
    await disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
