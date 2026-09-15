/**
 * Import Audemars Piguet Royal Oak Concept Split-Seconds GMT Large Date
 * Ref. 26650FA.OO.D002CA.01 (CFT carbon / yellow gold / skeleton)
 *
 * Listing: https://www.chrono24.com/audemarspiguet/audemars-piguet-royal-oak-concept-split-second-chronograh-gmt-large-date-cft-carbon---yellow-gold--skelet--id42851939.htm
 * Images: Audemars Piguet official media (Chrono24 blocks hotlinking)
 *
 * Usage:
 *   npx tsx scripts/import-audemars-piguet-royal-oak-concept-26650fa-chrono24.ts
 *   npx tsx scripts/import-audemars-piguet-royal-oak-concept-26650fa-chrono24.ts --apply
 */
import { createHash } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { BOTTLE_SIZES, type BottleSize } from "../src/lib/bottle-sizes";
import { rebuildWatchDescriptionFromRecord } from "./lib/catalog-product-description";
import { downloadWatchImagesFromUrls } from "./lib/catalog-image-import";
import { createScriptPrisma } from "./lib/script-prisma";
import { defaultCatalogCostPriceGhs } from "./lib/catalog-cost";

const apply = process.argv.includes("--apply");

const LISTING_URL =
  "https://www.chrono24.com/audemarspiguet/audemars-piguet-royal-oak-concept-split-second-chronograh-gmt-large-date-cft-carbon---yellow-gold--skelet--id42851939.htm";
const AP_PRODUCT_URL =
  "https://www.audemarspiguet.com/en/watch-collection/royal-oak-concept/26650FA.OO.D002CA.01.html";

const PRICE_GHS = 1350;
const STOCK_PER_BRANCH = 1;

const BRAND = "Audemars Piguet";
const MODEL = "Royal Oak Concept Split-Seconds GMT Large Date";
const REFERENCE = "26650FA.OO.D002CA.01";
const COLLECTION = "Royal Oak Concept";

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

function apImageUrl(asset: string, size = "1920,0"): string {
  return `https://dynamicmedia.audemarspiguet.com/is/image/audemarspiguet/${asset}?size=${size}&fmt=jpg&dpr=off`;
}

async function fetchApProductImageUrls(): Promise<string[]> {
  const res = await fetch(AP_PRODUCT_URL, {
    headers: { "User-Agent": "CosyAuraCatalogImport/1.0" },
  });
  if (!res.ok) throw new Error(`Failed to fetch AP product page (${res.status})`);
  const html = await res.text();

  const carousel = [...html.matchAll(/car(\d)_26650FA\.OO\.D002CA\.01_1920x1080/g)]
    .map((m) => Number(m[1]))
    .filter((n, i, arr) => arr.indexOf(n) === i)
    .sort((a, b) => a - b)
    .map((n) =>
      apImageUrl(`car${n}_26650FA.OO.D002CA.01_1920x1080`)
    );

  const hero = apImageUrl("watch-1171", "2560,0");
  const extras = [apImageUrl("front-247", "2560,0"), apImageUrl("back-248", "2560,0")];

  const urls = [hero, ...carousel, ...extras];
  if (!urls.length) {
    throw new Error("No product images found on AP product page");
  }
  return urls;
}

const LEAD = `This limited-edition Royal Oak Concept merges CFT forged carbon with 18-carat yellow gold in a 43 mm case built for high complication. Yellow gold bezel and push-piece guards contrast black ceramic crown and chronograph pushers, while a glareproofed sapphire crystal and exhibition caseback reveal the openworked architecture within.

Calibre 4407 delivers a split-seconds flyback chronograph, GMT 24-hour indication, and large date with a 70-hour power reserve. The skeleton dial pairs gold rectangular hour markers with Royal Oak Concept hands over a black inner bezel. Limited to 100 pieces, finished on a black rubber strap with yellow gold AP folding clasp and an additional textured strap.`;

function buildDescription(): string {
  return rebuildWatchDescriptionFromRecord({
    model: MODEL,
    reference: REFERENCE,
    category: "Chronograph",
    collection: COLLECTION,
    bottleDetail:
      "43 mm CFT carbon · 18 ct yellow gold bezel · sapphire crystal · 50 m WR",
    liquidColor: "Black openworked skeleton · gold markers",
    longevity: "Calibre 4407 · split-seconds flyback · GMT · 70 h reserve",
    bottleSize: 43,
    condition: "EXCELLENT",
    lead: LEAD,
    legacyDescription: `Specifications
- Reference: ${REFERENCE}
- Collection: Royal Oak Concept
- Case: 43 mm CFT carbon, 17.4 mm thick, 18 ct yellow gold bezel and guards
- Dial: Black openworked skeleton with gold rectangular indexes
- Crystal: Glareproofed sapphire front and exhibition back
- Crown / pushers: Black ceramic
- Strap: Black rubber with 18 ct yellow gold AP folding clasp (+ extra textured strap)
- Movement: Self-winding calibre 4407
- Functions: Split-seconds flyback chronograph, GMT 24 h, large date, hours, minutes
- Power reserve: 70 hours
- Water resistance: 50 metres
- Limited edition: 100 pieces
- Caseback: Engraved "Limited Edition"`,
  });
}

const CONDITION_REPORT =
  "Excellent condition. 43 mm CFT carbon and yellow gold Royal Oak Concept with skeleton dial. Calibre 4407 split-seconds GMT chronograph, black rubber strap with gold clasp. Sapphire crystal, 50 m WR. Box and papers where supplied.";

async function main() {
  console.log(apply ? "Importing watch…" : "Dry run — pass --apply to write");
  console.log(`Listing: ${LISTING_URL}\n`);

  const imageSourceUrls = await fetchApProductImageUrls();
  const brandSlug = slugify(BRAND);
  const slug = slugify(`${brandSlug}-royal-oak-concept-split-seconds-${REFERENCE}`);

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
      where: { brandId_slug: { brandId: brand.id, slug: "royal-oak-concept" } },
      update: { name: "Royal Oak Concept" },
      create: {
        brandId: brand.id,
        name: "Royal Oak Concept",
        slug: "royal-oak-concept",
      },
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
      condition: "EXCELLENT" as const,
      fragranceFamily: "WOODY" as const,
      bottleMaterial: "METAL" as const,
      bottleDetail:
        "43 mm CFT carbon · 18 ct yellow gold bezel · sapphire crystal · 50 m WR",
      bottleSize: 43,
      capType: "MAGNETIC" as const,
      liquidColor: "Black openworked skeleton · gold markers",
      longevity: "Calibre 4407 · split-seconds flyback · GMT · 70 h reserve",
      bottleShape: "Royal Oak Concept tonneau",
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
    console.log(`  Images saved: ${imageUrls.length}`);
  } finally {
    await disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
