/**
 * Import Wolbrook Pan4Timer Automatic from Shopify.
 *
 * Usage:
 *   npx tsx scripts/import-wolbrook-pan4timer.ts
 *   npx tsx scripts/import-wolbrook-pan4timer.ts --apply
 */
import { createHash } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { BOTTLE_SIZES, type BottleSize } from "../src/lib/bottle-sizes";
import { downloadWatchImagesFromShopify } from "./lib/catalog-image-import";
import { createScriptPrisma } from "./lib/script-prisma";
import { defaultCatalogCostPriceGhs } from "./lib/catalog-cost";

const apply = process.argv.includes("--apply");

const PRODUCT_URL =
  "https://wolbrook.com/products/pan4timer-automatic-watch";

const PRICE_GHS = 950;
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
    .replace(/<a[^>]*>([^<]*)<\/a>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&reg;/g, "®")
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
};

type ShopifyImage = {
  src: string;
  position: number;
  alt: string | null;
};

type ShopifyProduct = {
  title: string;
  vendor: string;
  body_html: string;
  variants: ShopifyVariant[];
  images: ShopifyImage[];
};

/** Keep Pan4Timer watch photos; skip standalone strap/bracelet accessory shots. */
function isProductPhoto(img: ShopifyImage): boolean {
  const alt = (img.alt || "").toLowerCase();
  const file = img.src.toLowerCase();

  if (alt.includes("grand prix")) return false;
  if (alt.includes("leather strap & steel buckle")) return false;
  if (alt.includes("tropic rubber strap & steel buckle")) return false;
  if (file.includes("20-16mm-camel-rally")) return false;
  if (file.includes("3-links-bracelet-steel-shape")) return false;
  if (file.includes("3-links-bracelet-steel-back")) return false;
  if (file.includes("orange_tropic_rubber_strap")) return false;
  if (file.includes("black-rubber-strap-20mm")) return false;
  if (file.includes("warranty") || file.includes("garantie")) return false;

  return (
    file.includes("pan4timer") ||
    file.includes("panatimer") ||
    file.includes("wrist-shot-pan4timer") ||
    /25-pan-001/.test(file)
  );
}

function buildDescription(product: ShopifyProduct, reference: string): string {
  const intro = stripHtml(product.body_html);

  const variantLines = product.variants.map((v) => {
    const label = v.option1 || v.title;
    const sku = v.sku ? ` (${v.sku})` : "";
    return `- ${label}${sku}`;
  });

  return `${intro}

**Strap & bracelet options** (select at checkout)
${variantLines.join("\n")}

**Specifications**
- Reference: ${reference}
- Collection: Pan4Timer
- Case: 40 mm diameter · 48 mm lug-to-lug · 13 mm thick · 20 mm lugs
- Material: Brushed 316L stainless steel, HexapleX® shock-resistant architecture
- Crystal: Domed sapphire glass box with inner anti-reflective coating
- Dial: Black multi-layer with four-arrow hour disk (4 time zones)
- Luminous: C3 Super-LumiNova® on hands and indices
- Bezel: 120-click unidirectional rotatable steel bezel
- Crown: Screw-down
- Movement: Citizen / Miyota 8315 automatic · ~60 h power reserve · hacking seconds
- Water resistance: 15 ATM (150 m)
- Assembly: France

**Warranty**
36-month manufacturer warranty from date of receipt.`;
}

const CONDITION_REPORT =
  "New tool-watch. Miyota 8315 automatic movement. Black dial with four-zone hour disk, 40 mm steel case, 150 m WR. Strap/bracelet options: orange or black Tropic rubber, camel rally leather, 3-link steel, or beads-of-rice bracelet.";

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
  console.log(apply ? "Importing Wolbrook watch…" : "Dry run — pass --apply to write");
  console.log(`Source: ${PRODUCT_URL}\n`);

  const product = await fetchShopifyProduct(PRODUCT_URL);
  const brandName = product.vendor.trim() || "Wolbrook";
  const brandSlug = slugify(brandName);
  const model = "Pan4Timer Automatic";
  const reference = "25-PAN-001";
  const slug = slugify(`${brandSlug}-pan4timer-automatic-${reference}`);
  const productImages = product.images.filter(isProductPhoto);

  console.log(`Brand: ${brandName}`);
  console.log(`Model: ${model}`);
  console.log(`Reference: ${reference}`);
  console.log(`Slug: ${slug}`);
  console.log(`Price: ${PRICE_GHS} GHS`);
  console.log(`Variants: ${product.variants.length}`);
  for (const v of product.variants) {
    console.log(`  · ${v.title} — ${v.sku} (${v.price} USD)`);
  }
  console.log(`Images: ${productImages.length} watch photos (${product.images.length} total)\n`);

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
      where: { brandId_slug: { brandId: brand.id, slug: "pan4timer" } },
      update: { name: "Pan4Timer" },
      create: { brandId: brand.id, name: "Pan4Timer", slug: "pan4timer" },
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
      costPriceGhs: defaultCatalogCostPriceGhs("WATCH", data.bottleSize ?? 50),
      condition: "UNWORN" as const,
      year: 2026,
      fragranceFamily: "WOODY" as const,
      bottleMaterial: "METAL" as const,
      bottleDetail:
        "40 mm steel · HexapleX® case · sapphire glass box · screw-down crown · 150 m WR · 20 mm lugs",
      bottleSize: 40,
      capType: "MAGNETIC" as const,
      liquidColor: "Black dial · C3 Super-LumiNova",
      longevity: "Miyota 8315 automatic · ~60 h power reserve · ±15 s/day",
      bottleShape: "Tool watch / diver",
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
      collection: "Pan4Timer",
      stock: STOCK_PER_BRANCH * Math.max(branches.length, 1),
      rating: 4.8,
      featured: true,
      category: "Tool watch",
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
    console.log(
      `  Strap variants: ${product.variants.map((v) => v.option1).join(", ")}`
    );
  } finally {
    await disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
