/**
 * Batch import sneakers from sneakers.com URLs (metadata + GHS prices).
 * Images are resolved from brand CDNs (Nike / Adidas / Reebok / StockX) because
 * sneakers.com blocks automated scraping.
 *
 * Usage:
 *   npx tsx scripts/import-sneakers-batch-sneakers-com.ts
 *   npx tsx scripts/import-sneakers-batch-sneakers-com.ts --apply
 *   npx tsx scripts/import-sneakers-batch-sneakers-com.ts --only=samba-og-j --apply
 */
import { createHash } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { BOTTLE_SIZES, type BottleSize } from "../src/lib/bottle-sizes";
import { downloadSneakerImagesFromUrls } from "./lib/catalog-image-import";
import { resolveSneakerImages } from "./lib/sneaker-image-sources";
import { createScriptPrisma } from "./lib/script-prisma";

const apply = process.argv.includes("--apply");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const onlyKeys = onlyArg
  ? new Set(onlyArg.replace("--only=", "").split(",").map((s) => s.trim()))
  : null;

const STOCK_PER_BRANCH = 2;
const BARCODE_LEAD: Record<BottleSize, string> = { 30: "3", 50: "5", 100: "1" };

type SneakerConfig = {
  key: string;
  sourceUrl: string;
  priceGhs: number;
  brand: string;
  model: string;
  styleCode: string;
  gender: "MENS" | "WOMENS" | "UNISEX";
  category: string;
  colorway: string;
  collection: string;
  bottleDetail: string;
  imageCandidates?: string[];
};

const STOCKX = (name: string) =>
  `https://images.stockx.com/images/${name}?fit=fill&bg=FFFFFF&w=700&h=500`;

const SNEAKERS: SneakerConfig[] = [
  {
    key: "samba-og-j-white-black-gum",
    sourceUrl: "https://www.sneakers.com/p/samba-og-j-white-black-gum-ie3675",
    priceGhs: 350,
    brand: "Adidas",
    model: "Samba OG J White Black Gum",
    styleCode: "IE3675",
    gender: "UNISEX",
    category: "Lifestyle",
    colorway: "White / Black / Gum",
    collection: "Samba",
    bottleDetail: "Leather upper · Gum rubber outsole",
    imageCandidates: [
      "https://assets.adidas.com/images/w_600,f_auto,q_auto/fad9d2516e464405abd783de49daf523_9366/Samba_OG_Shoes_Kids_White_IE3675_01_standard.jpg",
    ],
  },
  {
    key: "air-max-95-big-bubble-granite",
    sourceUrl:
      "http://sneakers.com/p/nike-air-max-95-big-bubble-granite-hm4740-007",
    priceGhs: 380,
    brand: "Nike",
    model: "Air Max 95 Big Bubble Granite",
    styleCode: "HM4740-007",
    gender: "MENS",
    category: "Lifestyle",
    colorway: "Granite / Black",
    collection: "Air Max",
    bottleDetail: "Mesh and synthetic upper · Visible Air cushioning",
  },
  {
    key: "wmns-samba-og-maroon",
    sourceUrl: "https://www.sneakers.com/p/wmns-samba-og-maroon-id0477",
    priceGhs: 350,
    brand: "Adidas",
    model: "Samba OG Maroon",
    styleCode: "ID0477",
    gender: "WOMENS",
    category: "Lifestyle",
    colorway: "Maroon / White / Gum",
    collection: "Samba",
    bottleDetail: "Leather upper · Gum rubber outsole",
    imageCandidates: [STOCKX("adidas-Samba-OG-Maroon-Product.jpg")],
  },
  {
    key: "yeezy-350-v2-mx-dark-salt",
    sourceUrl: "https://www.sneakers.com/p/yeezy-boost-350-v2-mx-dark-salt-id4811",
    priceGhs: 370,
    brand: "Adidas",
    model: "Yeezy Boost 350 V2 MX Dark Salt",
    styleCode: "ID4811",
    gender: "UNISEX",
    category: "Lifestyle",
    colorway: "MX Dark Salt",
    collection: "Yeezy",
    bottleDetail: "Primeknit upper · Boost midsole",
    imageCandidates: [STOCKX("adidas-Yeezy-Boost-350-V2-MX-Dark-Salt-Product.jpg")],
  },
  {
    key: "yeezy-700-wash-orange",
    sourceUrl:
      "https://www.sneakers.com/p/yeezy-boost-700-wash-orange-yzy-700-wash-orange",
    priceGhs: 300,
    brand: "Adidas",
    model: "Yeezy Boost 700 Wash Orange",
    styleCode: "YZY-700-WASH-ORANGE",
    gender: "UNISEX",
    category: "Lifestyle",
    colorway: "Wash Orange",
    collection: "Yeezy",
    bottleDetail: "Mixed-material upper · Boost midsole",
    imageCandidates: [STOCKX("adidas-Yeezy-Boost-700-Wash-Orange-Product.jpg")],
  },
  {
    key: "air-force-1-07-triple-white",
    sourceUrl: "https://www.sneakers.com/p/air-force-1-07-triple-white-cw2288-111",
    priceGhs: 280,
    brand: "Nike",
    model: "Air Force 1 '07 Triple White",
    styleCode: "CW2288-111",
    gender: "MENS",
    category: "Lifestyle",
    colorway: "Triple White",
    collection: "Air Force 1",
    bottleDetail: "Leather upper · Air-Sole unit",
    imageCandidates: [
      "https://static.nike.com/a/images/t_web_pdp_936_v2/f_auto,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/b7d9211c-26e7-431a-ac24-b0540fb3c00f/AIR+FORCE+1+%2707.png",
      STOCKX("Nike-Air-Force-1-07-White-Product.jpg"),
    ],
  },
  {
    key: "wmns-dunk-low-black-white",
    sourceUrl: "https://www.sneakers.com/p/wmns-dunk-low-black-white-dd1503-101",
    priceGhs: 300,
    brand: "Nike",
    model: "Dunk Low Black White",
    styleCode: "DD1503-101",
    gender: "WOMENS",
    category: "Lifestyle",
    colorway: "Black / White",
    collection: "Dunk",
    bottleDetail: "Leather upper · Classic cupsole",
    imageCandidates: [
      "https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/3712d261-1af0-4a7e-bd56-2ec115b4c50a/NIKE+DUNK+LOW+NBY.png",
    ],
  },
  {
    key: "adizero-evo-sl-white-black",
    sourceUrl: "https://www.sneakers.com/p/adizero-evo-sl-white-black-jh6206",
    priceGhs: 390,
    brand: "Adidas",
    model: "Adizero Evo SL White Black",
    styleCode: "JH6206",
    gender: "UNISEX",
    category: "Running",
    colorway: "White / Black",
    collection: "Adizero",
    bottleDetail: "Lightweight mesh upper · Lightstrike cushioning",
    imageCandidates: [STOCKX("adidas-Adizero-Evo-SL-White-Black-Product.jpg")],
  },
  {
    key: "ja-3-valentines-day",
    sourceUrl: "https://www.sneakers.com/p/nike-ja-3-valentine-s-day-hf2793-601",
    priceGhs: 400,
    brand: "Nike",
    model: "JA 3 Valentine's Day",
    styleCode: "HF2793-601",
    gender: "MENS",
    category: "Basketball",
    colorway: "Valentine's Day",
    collection: "JA",
    bottleDetail: "Performance basketball upper · Zoom Air cushioning",
    imageCandidates: [STOCKX("Nike-Ja-3-Valentines-Day-Product.jpg")],
  },
  {
    key: "zoom-fly-6-black-smoke-grey",
    sourceUrl:
      "https://www.sneakers.com/p/zoom-fly-6-black-light-smoke-grey-fn8454-001",
    priceGhs: 450,
    brand: "Nike",
    model: "Zoom Fly 6 Black Light Smoke Grey",
    styleCode: "FN8454-001",
    gender: "MENS",
    category: "Running",
    colorway: "Black / Light Smoke Grey",
    collection: "Zoom Fly",
    bottleDetail: "Engineered mesh upper · ZoomX foam",
    imageCandidates: [
      "https://static.nike.com/a/images/t_web_pdp_936_v2/f_auto,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/1fd217ed-772d-4491-a54e-63026e6abcc9/ZOOM+FLY+6.png",
    ],
  },
  {
    key: "yuto-dunk-low-sb-asparagus",
    sourceUrl:
      "https://www.sneakers.com/p/yuto-horigome-x-dunk-low-sb-asparagus-hf8022-300",
    priceGhs: 450,
    brand: "Nike",
    model: "Yuto Horigome x Dunk Low SB Asparagus",
    styleCode: "HF8022-300",
    gender: "MENS",
    category: "Skateboarding",
    colorway: "Asparagus / Bronze",
    collection: "SB Dunk",
    bottleDetail: "Premium leather upper · Zoom Air insole",
    imageCandidates: [
      STOCKX("Nike-SB-Dunk-Low-Yuto-Horigome-Asparagus-Product.jpg"),
      "https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/0423b407-ad79-476f-9f0e-e9dd0a22087b/NIKE+DUNK+LOW+NBY.png",
    ],
  },
  {
    key: "workout-plus-mu-black-digital-pink",
    sourceUrl:
      "https://www.sneakers.com/p/workout-plus-mu-black-digital-pink-cn5194",
    priceGhs: 300,
    brand: "Reebok",
    model: "Workout Plus MU Black Digital Pink",
    styleCode: "CN5194",
    gender: "MENS",
    category: "Lifestyle",
    colorway: "Black / Digital Pink",
    collection: "Workout Plus",
    bottleDetail: "Leather upper · EVA midsole",
    imageCandidates: [
      "https://cdn.sneakers123.com/release/38278/reebok-workout-plus-mu-cn5194.jpg",
    ],
  },
  {
    key: "wildwood-acg-teal",
    sourceUrl: "https://www.sneakers.com/p/wildwood-acg-teal-ao3116-004",
    priceGhs: 400,
    brand: "Nike",
    model: "Wildwood ACG Teal",
    styleCode: "AO3116-004",
    gender: "MENS",
    category: "Outdoor",
    colorway: "Teal / Black",
    collection: "ACG",
    bottleDetail: "Mesh and synthetic upper · Rugged outsole",
  },
  {
    key: "nano-x3-electric-cobalt",
    sourceUrl: "https://www.sneakers.com/p/nano-x3-electric-cobalt-100069909",
    priceGhs: 500,
    brand: "Reebok",
    model: "Nano X3 Electric Cobalt",
    styleCode: "100069909",
    gender: "MENS",
    category: "Training",
    colorway: "Electric Cobalt",
    collection: "Nano",
    bottleDetail: "Flexweave upper · Floatride Energy foam",
    imageCandidates: [STOCKX("Reebok-Nano-X3-Electric-Cobalt.jpg")],
  },
  {
    key: "balenciaga-track-runners-black",
    sourceUrl:
      "https://www.flannels.com/balenciaga-track-runners-116334#colcode=11633403",
    priceGhs: 700,
    brand: "Balenciaga",
    model: "Track Runners Black",
    styleCode: "542023W1GB11000",
    gender: "MENS",
    category: "Lifestyle",
    colorway: "Black",
    collection: "Track",
    bottleDetail: "Mesh and nylon upper · Multi-layer rubber sole · 50 mm heel",
    imageCandidates: [
      "https://cdn.media.amplience.net/i/frasersdev/11633403_o?fmt=auto&w=1200",
      STOCKX("Balenciaga-Track-Black-Product.jpg"),
    ],
  },
  {
    key: "balenciaga-speed-trainers-black-black",
    sourceUrl:
      "https://www.flannels.com/balenciaga-speed-trainers-275209#colcode=27520969",
    priceGhs: 400,
    brand: "Balenciaga",
    model: "Speed Trainers Black/Black",
    styleCode: "485626W05G01000",
    gender: "WOMENS",
    category: "Lifestyle",
    colorway: "Black/Black",
    collection: "Speed",
    bottleDetail: "3D knit upper · Slip-on · Articulated rubber sole",
    imageCandidates: [
      "https://cdn.media.amplience.net/i/frasersdev/27520969_o?fmt=auto&w=1200",
      STOCKX("Balenciaga-Speed-Trainer-Triple-Black-Product.jpg"),
    ],
  },
  {
    key: "balenciaga-speed-sock-trainers-black-white",
    sourceUrl:
      "https://www.flannels.com/balenciaga-speed-sock-trainers-114164#colcode=11416440",
    priceGhs: 450,
    brand: "Balenciaga",
    model: "Speed Sock Trainers Black/White",
    styleCode: "483513W05G01185",
    gender: "MENS",
    category: "Lifestyle",
    colorway: "Black/White",
    collection: "Speed",
    bottleDetail: "Recycled knit upper · Slip-on · White sole unit",
    imageCandidates: [
      "https://cdn.media.amplience.net/i/frasersdev/11416440_o?fmt=auto&w=1200",
      STOCKX("Balenciaga-Speed-Trainer-Black-White-Product.jpg"),
    ],
  },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function productSlug(config: SneakerConfig): string {
  return slugify(`${config.brand}-${config.model}-${config.styleCode}`);
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

function buildDescription(config: SneakerConfig): string {
  return `${config.brand} ${config.model} (${config.styleCode}).

Colourway: ${config.colorway}. Sourced from ${config.sourceUrl}.

**Details**
- Style code: ${config.styleCode}
- Category: ${config.category}
- ${config.bottleDetail}
- Condition: New, unworn`;
}

async function importSneaker(
  config: SneakerConfig,
  imageUrls: string[],
  prisma: PrismaClient
) {
  const slug = productSlug(config);
  const brandSlug = slugify(config.brand);

  const branches = await prisma.branch.findMany({
    where: { active: true, country: "GH" },
    select: { id: true, name: true },
  });

  const brand = await prisma.brand.upsert({
    where: { slug: brandSlug },
    update: { name: config.brand },
    create: { name: config.brand, slug: brandSlug },
  });

  const data = {
    productType: "SNEAKER" as const,
    brandId: brand.id,
    model: config.model,
    reference: config.styleCode,
    description: buildDescription(config),
    conditionReport: "New in box. Unworn. Authentic sneaker.",
    price: config.priceGhs,
    costPriceGhs: 0,
    condition: "UNWORN" as const,
    year: 2026,
    fragranceFamily: "FRESH" as const,
    bottleMaterial: "ACRYLIC" as const,
    bottleDetail: config.bottleDetail,
    bottleSize: 42,
    capType: "SCREW" as const,
    liquidColor: config.colorway,
    longevity: "N/A",
    bottleShape: "Low-top sneaker",
    concentration: "EDP" as const,
    topNotes: [] as string[],
    heartNotes: [] as string[],
    baseNotes: [] as string[],
    sillage: "MODERATE" as const,
    sustainabilityScore: 3,
    isVegan: false,
    isCrueltyFree: true,
    sampleAvailable: false,
    gender: config.gender,
    collection: config.collection,
    stock: STOCK_PER_BRANCH * Math.max(branches.length, 1),
    rating: 4.8,
    featured: false,
    category: config.category,
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
        alt: `${config.brand} ${config.model} sneaker`,
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
  const targets = onlyKeys
    ? SNEAKERS.filter((s) => onlyKeys.has(s.key))
    : SNEAKERS;

  if (!targets.length) {
    console.error("No sneakers matched --only filter.");
    process.exit(1);
  }

  console.log(
    apply
      ? `Importing ${targets.length} sneaker(s)…`
      : `Dry run — ${targets.length} sneaker(s). Pass --apply to write.\n`
  );

  const prepared: { config: SneakerConfig; slug: string; sourceImages: string[] }[] =
    [];

  for (const config of targets) {
    const slug = productSlug(config);
    console.log(`\n── ${config.brand} ${config.model} (${config.key})`);
    console.log(`   Price: ${config.priceGhs} GHS · Slug: ${slug}`);
    console.log(`   Source: ${config.sourceUrl}`);

    const resolved = await resolveSneakerImages({
      brand: config.brand,
      styleCode: config.styleCode,
      imageCandidates: config.imageCandidates,
    });

    if (!resolved.length) {
      const fetched = await resolveSneakerImages({
        brand: config.brand,
        styleCode: config.styleCode,
      });
      resolved.push(...fetched);
    }

    console.log(`   Images: ${resolved.length}`);
    for (const url of resolved.slice(0, 3)) {
      console.log(`     · ${url.slice(0, 90)}${url.length > 90 ? "…" : ""}`);
    }

    if (!resolved.length) {
      console.warn(`   ⚠ No images found — skipping ${config.key}`);
      continue;
    }

    prepared.push({ config, slug, sourceImages: resolved });
  }

  if (!apply) {
    console.log("\nDry run complete. Re-run with --apply to persist.");
    return;
  }

  const { prisma, disconnect } = createScriptPrisma();

  try {
    for (const { config, slug, sourceImages } of prepared) {
      const cloudUrls = await downloadSneakerImagesFromUrls(
        sourceImages.slice(0, 4),
        slug,
        true
      );

      await importSneaker(config, cloudUrls, prisma);
      console.log(`✓ ${config.brand} ${config.model} → /sneakers/${slug}`);
    }

    console.log(`\nDone — ${prepared.length} sneaker(s) imported.`);
  } finally {
    await disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
