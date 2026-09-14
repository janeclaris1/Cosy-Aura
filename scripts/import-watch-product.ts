/**
 * Import a single watch from a Shopify product URL (Watches of Switzerland / similar).
 *
 * Usage:
 *   npx tsx scripts/import-watch-product.ts
 *   npx tsx scripts/import-watch-product.ts --apply
 */
import { createHash } from "crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { BOTTLE_SIZES, type BottleSize } from "../src/lib/bottle-sizes";
import { createScriptPrisma } from "./lib/script-prisma";

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

const apply = process.argv.includes("--apply");

const PRODUCT_URL =
  "https://www.watchesofswitzerland.com/products/omega-speedmaster-o32430385001002-17332508";

const PRICE_GHS = 1050;
const STOCK_PER_BRANCH = 1;

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

type ShopifyProduct = {
  title: string;
  vendor: string;
  handle: string;
  tags: string;
  images: Array<{ src: string; position: number }>;
};

const DESCRIPTION = `The Speedmaster 38 collection balances compact proportions with the iconic chronograph character of Omega's most celebrated line.

This reference pairs a black varnished dial with a matte finish and rounded sub-dials. White varnished hands carry Super-LumiNova for legibility in low light, including the chronograph seconds hand.

A polished bezel with a black aluminium insert frames the dial, bearing the legendary tachymeter scale with the emblematic "Dot Over Ninety". The polished and brushed stainless steel case measures 38 mm across with 14.5 mm thickness and 100 m water resistance, topped with a sapphire crystal.

The exhibition caseback reveals the Omega Co-Axial Calibre 3332 automatic movement with approximately 52 hours of power reserve. A brushed stainless steel bracelet with polished centre links and a comfort-release adjustment system completes the watch.

**Specifications**
- Reference: O32430385001002
- Collection: Speedmaster 38
- Case: 38 mm stainless steel, round, sapphire crystal
- Bezel: Polished steel with black aluminium tachymeter insert
- Dial: Black varnished, baton markers, chronograph layout
- Movement: Automatic, Co-Axial Calibre 3332, ~52 h power reserve
- Water resistance: 100 metres
- Bracelet: Stainless steel with deployment clasp
- Condition: New, unworn`;

const CONDITION_REPORT = `New luxury chronograph. Full set presentation available. Automatic Co-Axial movement. 38 mm case, 100 m water resistance. Deployment clasp on stainless steel bracelet.`;

async function fetchShopifyProduct(url: string): Promise<ShopifyProduct> {
  const jsonUrl = url.replace(/\/?$/, ".json");
  const res = await fetch(jsonUrl, {
    headers: { "User-Agent": "CosyAuraCatalogImport/1.0" },
  });
  if (!res.ok) throw new Error(`Failed to fetch product JSON (${res.status})`);
  const data = (await res.json()) as { product: ShopifyProduct };
  return data.product;
}

async function downloadImages(
  images: ShopifyProduct["images"],
  slug: string
): Promise<string[]> {
  const dir = path.join(process.cwd(), "public/images/watches", slug);
  await mkdir(dir, { recursive: true });

  const sorted = [...images].sort((a, b) => a.position - b.position);
  const localPaths: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const src = sorted[i].src.split("?")[0];
    const ext = path.extname(new URL(src).pathname) || ".jpg";
    const filename = `${String(i + 1).padStart(2, "0")}${ext}`;
    const filePath = path.join(dir, filename);
    const publicPath = `/images/watches/${slug}/${filename}`;

    if (apply) {
      const imgRes = await fetch(src, {
        headers: { "User-Agent": "CosyAuraCatalogImport/1.0" },
      });
      if (!imgRes.ok) throw new Error(`Image download failed: ${src}`);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      await writeFile(filePath, buf);
      console.log(`  ↓ ${publicPath}`);
    } else {
      console.log(`  would download → ${publicPath}`);
    }

    localPaths.push(publicPath);
  }

  return localPaths;
}

async function main() {
  console.log(apply ? "Importing watch…" : "Dry run — pass --apply to write");
  console.log(`Source: ${PRODUCT_URL}\n`);

  const product = await fetchShopifyProduct(PRODUCT_URL);
  const brandName = product.vendor.trim() || "OMEGA";
  const brandSlug = slugify(brandName);
  const model = "Speedmaster 38 Black";
  const reference = "O32430385001002";
  const slug = slugify(`${brandSlug}-${model}-${reference}`);
  const imageSlug = slugify(`${brandSlug}-speedmaster-38-black`);

  console.log(`Brand: ${brandName}`);
  console.log(`Model: ${model}`);
  console.log(`Reference: ${reference}`);
  console.log(`Slug: ${slug}`);
  console.log(`Price: ${PRICE_GHS} GHS`);
  console.log(`Images: ${product.images.length}\n`);

  const imageUrls = await downloadImages(product.images, imageSlug);

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

    const data = {
      productType: "WATCH" as const,
      brandId: brand.id,
      model,
      reference,
      description: DESCRIPTION,
      conditionReport: CONDITION_REPORT,
      price: PRICE_GHS,
      costPriceGhs: 0,
      condition: "UNWORN" as const,
      year: 2026,
      fragranceFamily: "WOODY" as const,
      bottleMaterial: "METAL" as const,
      bottleDetail: "38 mm stainless steel case · sapphire crystal · 100 m WR",
      bottleSize: 50,
      capType: "MAGNETIC" as const,
      liquidColor: null,
      longevity: "52 h power reserve (approx.)",
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
      collection: "Speedmaster",
      stock: STOCK_PER_BRANCH * Math.max(branches.length, 1),
      rating: 4.8,
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
  } finally {
    await disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
