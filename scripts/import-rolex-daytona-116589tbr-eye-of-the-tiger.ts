/**
 * Import Rolex Daytona 'Eye of the Tiger' 116589TBR White Gold (Shopify source).
 *
 * Usage:
 *   npx tsx scripts/import-rolex-daytona-116589tbr-eye-of-the-tiger.ts
 *   npx tsx scripts/import-rolex-daytona-116589tbr-eye-of-the-tiger.ts --apply
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
  "https://wristaficionado.com/products/rolex-daytona-eye-of-the-tiger-116589tbr-white-gold-2";

/** Boutique GHS listing — gem-set factory Daytona tier. */
const PRICE_GHS = 4800;
const STOCK_PER_BRANCH = 1;

const BRAND = "Rolex";
const MODEL = "Daytona Eye of the Tiger White Gold";
const REFERENCE = "116589TBR";
const COLLECTION = "Daytona";

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

const LEAD = `The Cosmograph Daytona 116589TBR, known as the Eye of the Tiger, is a dazzling interpretation of the iconic chronograph. Crafted in 18 ct white gold, its 40 mm case is framed by a brilliant-cut diamond bezel for unmistakable presence.

The defining feature is a tiger-patterned diamond pavé dial accented with black lacquer and diamond-set hour markers. Chronograph subdials in lustrous black keep the layout readable while the artistry takes center stage.

Black Oysterflex completes the look with sporty comfort. Caliber 4130 delivers manufacture chronograph precision and roughly 72 hours of power reserve. A true collector piece that pairs technical mastery with audacious gem-set design.`;

function buildDescription(lead: string): string {
  return rebuildWatchDescriptionFromRecord({
    model: MODEL,
    reference: REFERENCE,
    category: "Chronograph",
    collection: COLLECTION,
    bottleDetail:
      "40 mm 18 ct white gold · diamond-set bezel · black Oysterflex · 100 m WR",
    liquidColor: "Tiger pavé diamond dial · black lacquer · black / silver",
    longevity: "Caliber 4130 automatic chronograph · ~72 h power reserve",
    bottleSize: 40,
    condition: "EXCELLENT",
    lead,
    legacyDescription: `Specifications
- Reference: ${REFERENCE}
- Collection: Cosmograph Daytona
- Case: 40 mm, 18 ct white gold
- Bezel: Brilliant-cut diamond set
- Dial: Tiger-pattern diamond pavé with black lacquer and diamond hour markers
- Subdials: Black chronograph counters
- Bracelet: Black Oysterflex
- Movement: Caliber 4130 self-winding chronograph
- Water resistance: 100 metres
- Included: Original box and papers`,
  });
}

const CONDITION_REPORT =
  "Pre-owned gem-set chronograph in excellent condition. 40 mm white gold case with diamond bezel. Tiger pavé dial, black Oysterflex strap. Caliber 4130. Original box and papers. Carefully inspected before listing.";

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
  console.log(apply ? "Importing watch…" : "Dry run — pass --apply to write");
  console.log(`Source: ${PRODUCT_URL}\n`);

  const product = await fetchShopifyProduct(PRODUCT_URL);
  const brandSlug = slugify(BRAND);
  const slug = slugify(`${brandSlug}-daytona-eye-of-the-tiger-${REFERENCE}`);
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

    const description = buildDescription(LEAD);

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
      fragranceFamily: "WOODY" as const,
      bottleMaterial: "METAL" as const,
      bottleDetail:
        "40 mm 18 ct white gold · diamond-set bezel · black Oysterflex · 100 m WR",
      bottleSize: 40,
      capType: "MAGNETIC" as const,
      liquidColor: "Tiger pavé diamond dial · black / silver",
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
      gender: "UNISEX" as const,
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
  } finally {
    await disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
