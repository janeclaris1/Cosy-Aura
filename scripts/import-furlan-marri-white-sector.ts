/**
 * Import Furlan Marri White Sector from Sanity + Shopify CDN.
 *
 * Usage:
 *   npx tsx scripts/import-furlan-marri-white-sector.ts
 *   npx tsx scripts/import-furlan-marri-white-sector.ts --apply
 */
import { createHash } from "crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { BOTTLE_SIZES, type BottleSize } from "../src/lib/bottle-sizes";
import { createScriptPrisma } from "./lib/script-prisma";

const apply = process.argv.includes("--apply");

const PRODUCT_HANDLE = "white-sector-2161-a";
const SANITY_QUERY = encodeURIComponent(
  `*[_type match "product*" && store.slug.current == "${PRODUCT_HANDLE}"][0]{
    "title": store.title,
    "description": seo.description,
    "preview": store.previewImageUrl,
    "gallery": gallery.items[].media.image.asset->url,
    "attributes": attributes,
    "about": accordions[_type=="title" && title match "About*"][0].content[0].children[].text
  }`
);

const PRICE_GHS = 1350;
const REFERENCE = "WHITE-SECTOR-2161-A";
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

type SanityProduct = {
  title: string;
  description: string | null;
  preview: string | null;
  gallery: string[] | null;
  attributes: string[] | null;
  about: string[] | null;
};

async function fetchProduct(): Promise<SanityProduct> {
  const url = `https://8c019h2s.api.sanity.io/v2024-06-18/data/query/production?query=${SANITY_QUERY}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "CosyAuraCatalogImport/1.0" },
  });
  if (!res.ok) throw new Error(`Sanity query failed (${res.status})`);
  const data = (await res.json()) as { result: SanityProduct | null };
  if (!data.result) throw new Error("Product not found in Sanity");
  return data.result;
}

function buildDescription(product: SanityProduct): string {
  const intro =
    product.about?.join("") ||
    product.description ||
    "A Swiss automatic dress watch with Cornes de Vache lugs.";

  return `${intro}

**Included**
- 2 interchangeable leather straps: blue and black (quick-release)
- Watch pouch, warranty papers and micro-fibre cloth

**Dial colourways in the Cornes de Vache line**
Blue Sector · White Sector · Salmon Sector

**Specifications**
- Reference: ${REFERENCE}
- Collection: Cornes de Vache
- Case: 37.5 mm diameter · 46 mm lug-to-lug · 10.5 mm thick
- Lugs: Cornes de Vache ("cow horns") style
- Material: 316L stainless steel — perlage, mirror polish, satin-brush
- Crystal: Front and back sapphire with anti-reflective coating
- Dial: White sector-style, sand-blasted with stamped finish
- Indexes: Raised applied Breguet-style, highly polished steel
- Hands: Curved and domed, heat-blued steel
- Movement: La Joux-Perret G100 automatic · Swiss Made
- Power reserve: ~68 hours
- Functions: Hours, minutes, seconds
- Finishes: Geneva stripes, snailing, blued-steel screws
- Rotor: Tungsten with galvanized palladium coating
- Water resistance: 50 m (5 ATM)
- Lug width: 20 mm
- Warranty: 2-year international manufacturer warranty`;
}

const CONDITION_REPORT =
  "New Swiss automatic dress watch. La Joux-Perret G100 movement. White sector dial, 37.5 mm steel case, Cornes de Vache lugs, 50 m WR. Complete set with two leather straps, pouch and papers.";

function collectImageUrls(product: SanityProduct): string[] {
  const urls = new Set<string>();
  if (product.preview) urls.add(product.preview.split("?")[0]);
  for (const url of product.gallery ?? []) {
    if (url) urls.add(url.split("?")[0]);
  }
  return [...urls];
}

async function downloadImages(urls: string[], slug: string): Promise<string[]> {
  const dir = path.join(process.cwd(), "public/images/watches", slug);
  await mkdir(dir, { recursive: true });
  const localPaths: string[] = [];

  for (let i = 0; i < urls.length; i++) {
    const src = urls[i];
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
  console.log(
    apply ? "Importing Furlan Marri watch…" : "Dry run — pass --apply to write"
  );
  console.log(`Handle: ${PRODUCT_HANDLE}\n`);

  const product = await fetchProduct();
  const brandName = "Furlan Marri";
  const brandSlug = slugify(brandName);
  const model = "White Sector";
  const slug = slugify(`${brandSlug}-white-sector-${REFERENCE}`);
  const imageSlug = slugify(`${brandSlug}-white-sector`);
  const imageUrls = collectImageUrls(product);

  console.log(`Brand: ${brandName}`);
  console.log(`Model: ${model}`);
  console.log(`Reference: ${REFERENCE}`);
  console.log(`Slug: ${slug}`);
  console.log(`Price: ${PRICE_GHS} GHS`);
  console.log(`Attributes: ${(product.attributes ?? []).join(" · ")}`);
  console.log(`Images: ${imageUrls.length}\n`);

  const savedImages = await downloadImages(imageUrls, imageSlug);

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
      where: { brandId_slug: { brandId: brand.id, slug: "cornes-de-vache" } },
      update: { name: "Cornes de Vache" },
      create: {
        brandId: brand.id,
        name: "Cornes de Vache",
        slug: "cornes-de-vache",
      },
    });

    const data = {
      productType: "WATCH" as const,
      brandId: brand.id,
      seriesId: series.id,
      model,
      reference: REFERENCE,
      description: buildDescription(product),
      conditionReport: CONDITION_REPORT,
      price: PRICE_GHS,
      costPriceGhs: 0,
      condition: "UNWORN" as const,
      year: 2026,
      fragranceFamily: "WOODY" as const,
      bottleMaterial: "METAL" as const,
      bottleDetail:
        "37.5 mm steel · Cornes de Vache lugs · double sapphire · exhibition caseback · 50 m WR · 20 mm lugs",
      bottleSize: 38,
      capType: "MAGNETIC" as const,
      liquidColor: "White sector dial",
      longevity: "La Joux-Perret G100 · ~68 h power reserve · Swiss Made",
      bottleShape: "Dress watch",
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
      collection: "Cornes de Vache",
      stock: STOCK_PER_BRANCH * Math.max(branches.length, 1),
      rating: 4.9,
      featured: true,
      category: "Dress watch",
    };

    const existing = await prisma.fragrance.findUnique({ where: { slug } });
    const fragrance = existing
      ? await prisma.fragrance.update({ where: { slug }, data })
      : await prisma.fragrance.create({ data: { ...data, slug } });

    await prisma.fragranceImage.deleteMany({ where: { fragranceId: fragrance.id } });
    if (savedImages.length) {
      await prisma.fragranceImage.createMany({
        data: savedImages.map((url, i) => ({
          fragranceId: fragrance.id,
          url,
          alt: `${brandName} ${model} automatic watch`,
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
