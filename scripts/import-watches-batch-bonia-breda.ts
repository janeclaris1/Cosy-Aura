/**
 * Batch import Bonia & Breda watches (user-provided URLs + GHS prices).
 *
 * Usage:
 *   npx tsx scripts/import-watches-batch-bonia-breda.ts
 *   npx tsx scripts/import-watches-batch-bonia-breda.ts --apply
 *   npx tsx scripts/import-watches-batch-bonia-breda.ts --only=breda-sync-gold-evergreen --apply
 */
import { createHash } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { BOTTLE_SIZES, type BottleSize } from "../src/lib/bottle-sizes";
import { downloadWatchImagesFromEntries } from "./lib/catalog-image-import";
import { rebuildWatchDescriptionFromRecord } from "./lib/catalog-product-description";
import { createScriptPrisma } from "./lib/script-prisma";

const apply = process.argv.includes("--apply");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const onlyKeys = onlyArg
  ? new Set(onlyArg.replace("--only=", "").split(",").map((s) => s.trim()))
  : null;

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

type ShopifyImage = {
  id?: number;
  src: string;
  position: number;
  alt: string | null;
  variant_ids?: number[];
};

type ShopifyProduct = {
  title: string;
  vendor: string;
  body_html: string;
  tags: string;
  variants: { id: number; title: string; sku: string; option1: string | null }[];
  images: ShopifyImage[];
};

type WatchConfig = {
  key: string;
  brand: string;
  model: string;
  reference: string;
  priceGhs: number;
  collection: string;
  seriesSlug: string;
  gender: "MENS" | "WOMENS" | "UNISEX";
  category: string;
  bottleSize: number;
  bottleDetail: string;
  liquidColor: string;
  longevity: string;
  conditionReport: string;
  description: string;
  slug: string;
  imageSlug: string;
  featured?: boolean;
  getImages: () => Promise<{ src: string; sort: number }[]>;
};

async function fetchShopifyProduct(url: string): Promise<ShopifyProduct> {
  const jsonUrl = url.replace(/\/?(\?.*)?$/, ".json");
  const res = await fetch(jsonUrl, {
    headers: { "User-Agent": "CosyAuraCatalogImport/1.0" },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${jsonUrl} (${res.status})`);
  const data = (await res.json()) as { product: ShopifyProduct };
  return data.product;
}

function shopifyImages(
  product: ShopifyProduct,
  filter: (img: ShopifyImage) => boolean
): { src: string; sort: number }[] {
  return [...product.images]
    .filter(filter)
    .sort((a, b) => a.position - b.position)
    .map((img, i) => ({ src: img.src.split("?")[0], sort: i }));
}

const SIENA_GREEN_VARIANT = 44807336034490;
const BNB10742_SILVER = 40485608390791;
const BNB10742_ROSEGOLD = 40485608423559;

const WATCHES: WatchConfig[] = [
  {
    key: "breda-sync-gold-evergreen",
    brand: "Breda",
    model: "Sync Gold Evergreen",
    reference: "1752E",
    priceGhs: 950,
    collection: "Sync",
    seriesSlug: "sync",
    gender: "WOMENS",
    category: "Fashion watch",
    bottleSize: 25,
    bottleDetail:
      "25 mm 18K gold-plated round case · evergreen tinted crystal · 28 mm tapered hinge-link bracelet · 3 ATM",
    liquidColor: "Brushed dial beneath evergreen crystal",
    longevity: "Japanese Miyota quartz · SR626SW battery",
    conditionReport:
      "New fashion watch. 25 mm gold-plated Sync with evergreen crystal lens and pivoting hinge bracelet links.",
    description: `The Sync celebrates full-circle moments — endings that embrace new beginnings. A delicate 25 mm circular case pairs with a slender 28 mm tapered bracelet; each link uses a hinge mechanism to pivot and mould around the wrist. The brushed dial sits beneath an evergreen-coloured crystal for a jewel-like finish.

**Specifications**
- Reference: 1752E
- Collection: Sync
- Case: 25 mm · 18K gold-plated stainless steel
- Crystal: Evergreen-tinted lens
- Bracelet: 28 mm tapered gold-plated metal with hinge links
- Movement: Japanese Miyota quartz
- Battery: SR626SW (silver oxide)
- Water resistance: 3 ATM

**Warranty**
Manufacturer warranty from date of receipt.`,
    slug: "breda-sync-gold-evergreen-1752e",
    imageSlug: "breda-sync-gold-evergreen",
    featured: true,
    getImages: async () => {
      const p = await fetchShopifyProduct(
        "https://breda.com/products/breda-sync-1752e-gold-metal-watch"
      );
      return shopifyImages(p, (img) => {
        const f = img.src.toLowerCase();
        return (
          f.includes("breda-sync-1752e") &&
          !f.includes("lifestyle") &&
          !f.includes("winter") &&
          !f.includes("lookbook")
        );
      });
    },
  },
  {
    key: "bonia-men-classic-b10550",
    brand: "Bonia",
    model: "Men Classic",
    reference: "BNB10550-1647",
    priceGhs: 800,
    collection: "Classic",
    seriesSlug: "classic",
    gender: "MENS",
    category: "Dress watch",
    bottleSize: 36,
    bottleDetail:
      "36 mm IP silver steel case · IP rose gold bezel · two-tone bracelet · sapphire crystal · 3 ATM",
    liquidColor: "Brown dial · IP rose gold hands · crystal hour markers",
    longevity: "Japanese quartz · 3 hands with date",
    conditionReport:
      "New dress watch. Two-tone silver and rose gold steel, brown dial with crystal indices, date at 3 o'clock.",
    description: `A timeless classic that complements your style for every occasion — high-fashion polish with everyday wearability.

**Specifications**
- Reference: BNB10550-1647
- Collection: Classic
- Case: 36 mm IP silver stainless steel with IP rose gold bezel
- Dial: Brown with IP rose gold hands; fine crystals as hour markers
- Bracelet: 20 mm two-tone IP silver and IP rose gold stainless steel
- Crystal: Sapphire (scratch resistant)
- Movement: Japanese quartz, 3 hands with date
- Water resistance: 3 ATM

**Warranty**
1 year international warranty.`,
    slug: "bonia-men-classic-b10550-1647",
    imageSlug: "bonia-men-classic-b10550",
    getImages: async () => {
      const p = await fetchShopifyProduct(
        "https://publicwatch.com/products/bonia-men-classic-b10550-1647"
      );
      return shopifyImages(p, (img) => {
        const f = img.src.toLowerCase();
        return f.includes("b10550") && !f.includes("buckle");
      });
    },
  },
  {
    key: "bonia-siena-green",
    brand: "Bonia",
    model: "Siena Stainless Steel Green",
    reference: "BNB10872-2697S-000-000",
    priceGhs: 1100,
    collection: "Siena",
    seriesSlug: "siena",
    gender: "WOMENS",
    category: "Dress watch",
    bottleSize: 31,
    bottleDetail:
      "Stainless steel case · sapphire crystal · case stones · solid bracelet · 3 ATM",
    liquidColor: "Green dial",
    longevity: "GM14-10Z quartz movement",
    conditionReport:
      "New women's Siena in green. Sapphire crystal, case stones, refined steel bracelet for work or evening wear.",
    description: `The Siena Stainless Steel Women's Watch captivates with elegant design, sapphire crystal, and case stones. The green colourway reflects refined appeal for work or special events.

**Colourways** (reference listing: Green)
- Green — BNB10872-2697S-000-000

**Specifications**
- Reference: BNB10872-2697S-000-000
- Collection: Siena
- Case material: Stainless steel
- Dial opening: 24 mm
- Case size: (3–9) 31 mm, (12–6) 37 mm
- Crystal: Sapphire
- Crown: 5.0 mm
- Bracelet: 14.5 × 13 mm solid stainless steel
- Case stones: 44 × 1.5 mm stones
- Movement: GM14-10Z
- Water resistance: 3 ATM

**Warranty**
Manufacturer warranty from date of receipt.`,
    slug: "bonia-siena-stainless-steel-green-bnb10872",
    imageSlug: "bonia-siena-green",
    getImages: async () => {
      const p = await fetchShopifyProduct(
        "https://bonia.com/products/siena-stainless-steel-womens-watch"
      );
      return shopifyImages(p, (img) => {
        const f = img.src.toLowerCase();
        const vids = img.variant_ids ?? [];
        if (vids.includes(SIENA_GREEN_VARIANT)) return true;
        if (vids.length > 0) return false;
        return (
          f.includes("siena-stainless-steel-womens-watch") &&
          !f.includes("celeste") &&
          !f.includes("coralie")
        );
      });
    },
  },
  {
    key: "bonia-chronograph-silver-bnb10846",
    brand: "Bonia",
    model: "Women Chronograph Silver",
    reference: "BNB10846-2377C",
    priceGhs: 1200,
    collection: "Chronograph",
    seriesSlug: "chronograph",
    gender: "WOMENS",
    category: "Chronograph",
    bottleSize: 35,
    bottleDetail:
      "34.5 mm stainless steel case · IP silver bracelet · chronograph sub-dials · 5 ATM",
    liquidColor: "Silver sunray dial · IP silver hands",
    longevity: "Japanese quartz chronograph with date",
    conditionReport:
      "New women's chronograph. Steel case and bracelet, chronograph sub-dials, date window, 5 ATM WR.",
    description: `A polished chronograph that combines functionality, precision, and style — equally at home in the office or at evening events.

**Specifications**
- Reference: BNB10846-2377C
- Collection: Chronograph
- Case: 34.5 mm stainless steel
- Dial: Silver sunray
- Bracelet: IP silver stainless steel
- Movement: Japanese quartz chronograph with date
- Water resistance: 5 ATM

**Warranty**
1 year international warranty.`,
    slug: "bonia-women-chronograph-silver-bnb10846-2377c",
    imageSlug: "bonia-chronograph-bnb10846-silver",
    getImages: async () =>
      [1, 2, 3].map((n, i) => ({
        src: `https://static-my.zacdn.com/p/bonia-watches-8931-6882634-${n}.jpg`,
        sort: i,
      })),
  },
  {
    key: "bonia-elegance-bnb10742-silver",
    brand: "Bonia",
    model: "Women Elegance Silver",
    reference: "BNB10742-2317S",
    priceGhs: 780,
    collection: "Elegance",
    seriesSlug: "elegance",
    gender: "WOMENS",
    category: "Dress watch",
    bottleSize: 32,
    bottleDetail:
      "32 mm stainless steel · bezel with 36 fine crystals · sapphire crystal · 3 ATM",
    liquidColor: "Silver dial · IP silver indices",
    longevity: "Japanese quartz",
    conditionReport:
      "New Elegance in IP silver. Crystal-set bezel, sapphire glass, steel bracelet.",
    description: `The Elegance collection sits beautifully on the wrist of the stylish woman — refined for office wear or evening events.

**Colourways** (reference listing: Silver)
- Silver — BNB10742-2317S

**Specifications**
- Reference: BNB10742-2317S
- Collection: Elegance
- Case: 32 mm stainless steel
- Dial: Silver
- Bezel: Embellished with 36 fine crystals
- Bracelet: IP silver stainless steel
- Crystal: Sapphire (scratch resistant)
- Movement: Japanese quartz
- Water resistance: 3 ATM

**Warranty**
1 year international warranty.`,
    slug: "bonia-women-elegance-silver-bnb10742",
    imageSlug: "bonia-elegance-bnb10742-silver",
    getImages: async () => {
      const p = await fetchShopifyProduct(
        "https://jamsistem.com/products/bonia-women-elegance-bnb10742"
      );
      return shopifyImages(p, (img) => {
        const f = img.src.toLowerCase();
        const vids = img.variant_ids ?? [];
        if (vids.includes(BNB10742_SILVER)) return true;
        if (vids.length === 0 && (f.includes("side") || f.includes("rear")))
          return true;
        return false;
      });
    },
  },
  {
    key: "bonia-elegance-bnb10742-rosegold",
    brand: "Bonia",
    model: "Women Elegance Silver Rose Gold",
    reference: "BNB10742-2667S",
    priceGhs: 1080,
    collection: "Elegance",
    seriesSlug: "elegance",
    gender: "WOMENS",
    category: "Dress watch",
    bottleSize: 32,
    bottleDetail:
      "32 mm stainless steel · crystal-set bezel · two-tone IP silver/rose gold bracelet · sapphire · 3 ATM",
    liquidColor: "Silver dial · IP silver and rose gold accents",
    longevity: "Japanese quartz",
    conditionReport:
      "New Elegance in silver/rose gold two-tone. Crystal bezel, sapphire crystal, steel bracelet.",
    description: `The Elegance collection in a two-tone silver and rose gold finish — crystal-set bezel and sapphire glass for everyday luxury.

**Colourways** (reference listing: Silver/Rosegold)
- Silver/Rosegold — BNB10742-2667S

**Specifications**
- Reference: BNB10742-2667S
- Collection: Elegance
- Case: 32 mm stainless steel
- Dial: Silver
- Bezel: Embellished with 36 fine crystals
- Bracelet: IP silver / rose gold stainless steel
- Crystal: Sapphire (scratch resistant)
- Movement: Japanese quartz
- Water resistance: 3 ATM

**Warranty**
1 year international warranty.`,
    slug: "bonia-women-elegance-silver-rosegold-bnb10742",
    imageSlug: "bonia-elegance-bnb10742-rosegold",
    getImages: async () => {
      const p = await fetchShopifyProduct(
        "https://jamsistem.com/products/bonia-women-elegance-bnb10742"
      );
      return shopifyImages(p, (img) => {
        const f = img.src.toLowerCase();
        const vids = img.variant_ids ?? [];
        if (vids.includes(BNB10742_ROSEGOLD)) return true;
        if (vids.length === 0 && (f.includes("side") || f.includes("rear")))
          return true;
        return false;
      });
    },
  },
  {
    key: "bonia-b10811-2253s",
    brand: "Bonia",
    model: "B10811-2253S Analog",
    reference: "BNB10811-2253S",
    priceGhs: 1300,
    collection: "Elegance",
    seriesSlug: "elegance",
    gender: "WOMENS",
    category: "Dress watch",
    bottleSize: 37,
    bottleDetail:
      "23 × 37 mm stainless steel · IP gold bracelet · sapphire crystal · 3 ATM",
    liquidColor: "White mother-of-pearl dial",
    longevity: "Japanese quartz",
    conditionReport:
      "New women's dress watch. Rectangular case, MOP dial, IP gold steel bracelet, sapphire glass.",
    description: `An elegant analog dress watch with a white mother-of-pearl dial and IP gold stainless steel bracelet.

**Specifications**
- Reference: BNB10811-2253S
- Collection: Elegance
- Case: 23 mm × 37 mm stainless steel
- Dial: White mother-of-pearl
- Bracelet: IP gold stainless steel
- Crystal: Sapphire (scratch resistant)
- Movement: Japanese quartz
- Water resistance: 3 ATM

**Warranty**
1 year international warranty.`,
    slug: "bonia-b10811-2253s-analog",
    imageSlug: "bonia-b10811-2253s",
    getImages: async () => {
      const p = await fetchShopifyProduct(
        "https://publicwatch.com/products/bonia-b10811-2253s-analog"
      );
      return shopifyImages(p, (img) => {
        const f = img.src.toLowerCase();
        return (
          f.includes("bnb10811") &&
          !f.includes("warranty") &&
          !f.includes("boniabox")
        );
      });
    },
  },
  {
    key: "bonia-missie-tale-bnb10843",
    brand: "Bonia",
    model: "Missie Tale Elegance",
    reference: "BNB10843-2517S",
    priceGhs: 1250,
    collection: "Missie Tale",
    seriesSlug: "missie-tale",
    gender: "WOMENS",
    category: "Fashion watch",
    bottleSize: 40,
    bottleDetail:
      "28 × 40.2 mm stainless steel · rose gold bracelet · sapphire glass · owl case-back engraving · 3 ATM",
    liquidColor: "White dial · owl motif · crystal embellishment",
    longevity: "Quartz · analog with date",
    conditionReport:
      "New Missie Tale Elegance. Owl dial design with crystals, rose gold steel bracelet, engraved case back.",
    description: `The Missie Tale draws on the owl — a symbol of vision and wisdom — in a compact, charismatic design embellished with fine crystals. An owl is engraved on the case back.

**Specifications**
- Reference: BNB10843-2517S
- Collection: Missie Tale / Elegance
- Case: 28 mm × 40.2 mm stainless steel
- Dial: White with owl design and fine crystals
- Bracelet: Rose gold stainless steel
- Crystal: Sapphire (scratch resistant)
- Display: Analog with date
- Movement: Quartz
- Water resistance: 30 m (3 ATM)

**Warranty**
1 year international warranty.`,
    slug: "bonia-missie-tale-elegance-bnb10843-2517s",
    imageSlug: "bonia-missie-tale-bnb10843",
    getImages: async () =>
      [
        "https://cdn.store-assets.com/s/335146/i/89983085.png",
        "https://cdn.store-assets.com/s/335146/i/89983090.png",
        "https://cdn.store-assets.com/s/335146/i/89983105.png",
      ].map((src, i) => ({ src, sort: i })),
  },
  {
    key: "bonia-elegance-bnb10553-purple",
    brand: "Bonia",
    model: "Women Elegance Purple",
    reference: "BNB10553-3667S",
    priceGhs: 1600,
    collection: "Elegance",
    seriesSlug: "elegance",
    gender: "WOMENS",
    category: "Dress watch",
    bottleSize: 31,
    bottleDetail:
      "31 mm IP silver case · IP rose gold crystal-set bezel · two-tone bracelet · sapphire · 5 ATM",
    liquidColor: "Purple dial · IP rose gold hands · crystal hour markers",
    longevity: "Japanese quartz · 3 hands with date",
    conditionReport:
      "New Elegance with purple dial. Rose gold crystal bezel, two-tone bracelet, date at 3, 5 ATM.",
    description: `Elegantly enhanced with a top ring and hour indexes set with fine crystals — equally comfortable for office wear or evening events.

**Specifications**
- Reference: BNB10553-3667S
- Collection: Elegance
- Case: 31 mm IP silver stainless steel
- Bezel: IP rose gold embellished with 36 fine crystals
- Dial: Purple with IP rose gold hands; 11 fine crystals as hour markers
- Bracelet: Two-tone IP rose gold and IP silver stainless steel
- Crystal: Sapphire (scratch resistant)
- Movement: Japanese quartz, 3 hands with date
- Water resistance: 5 ATM

**Warranty**
1 year international warranty.`,
    slug: "bonia-women-elegance-purple-bnb10553-3667s",
    imageSlug: "bonia-elegance-bnb10553-purple",
    getImages: async () =>
      [
        "https://cdn.store-assets.com/s/732376/i/63778407.jpeg",
        "https://cdn.store-assets.com/s/732376/i/63778408.jpeg",
        "https://cdn.store-assets.com/s/732376/i/63778410.jpeg",
      ].map((src, i) => ({ src, sort: i })),
  },
  {
    key: "breda-pulse-gold-26mm",
    brand: "Breda",
    model: "Pulse Gold 26mm",
    reference: "1750A",
    priceGhs: 950,
    collection: "Pulse",
    seriesSlug: "pulse",
    gender: "WOMENS",
    category: "Fashion watch",
    bottleSize: 26,
    bottleDetail:
      "26 mm 18K gold-plated rectangular case · tapered bracelet · pusher clasp · 3 ATM",
    liquidColor: "Numerical display window · gold dial",
    longevity: "Japanese Miyota quartz · SR626SW battery",
    conditionReport:
      "New Pulse with enlarged numerical window. Slim 26 mm gold-plated rectangle, tapered bracelet, pusher clasp.",
    description: `The beloved Pulse timepiece, revitalized with a larger numerical display window for effortless reading at a glance. A slim 26 mm 18K gold-plated stainless steel rectangle with refined edges meets a tapered bracelet with pusher clasp.

**Specifications**
- Reference: 1750A
- Collection: Pulse
- Case: 26 mm × 18K gold-plated stainless steel (rectangular)
- Bracelet: Tapered gold-plated metal, pusher clasp
- Movement: Japanese Miyota quartz
- Battery: SR626SW (silver oxide)
- Water resistance: 3 ATM

**Warranty**
Manufacturer warranty from date of receipt.`,
    slug: "breda-pulse-gold-26mm-1750a",
    imageSlug: "breda-pulse-gold-26mm",
    featured: true,
    getImages: async () => {
      const p = await fetchShopifyProduct(
        "https://breda.com/products/breda-pulse-1750a-gold-metal-bracelet-watch"
      );
      return shopifyImages(p, (img) => {
        const f = img.src.toLowerCase();
        return (
          f.includes("breda-pulse-1750a") &&
          !f.includes("lifestyle") &&
          !f.includes("lookbook")
        );
      });
    },
  },
];

async function importWatch(config: WatchConfig, prisma: PrismaClient) {
  const brandSlug = slugify(config.brand);
  const branches = await prisma.branch.findMany({
    where: { active: true, country: "GH" },
    select: { id: true },
  });

  const brand = await prisma.brand.upsert({
    where: { slug: brandSlug },
    update: { name: config.brand },
    create: { name: config.brand, slug: brandSlug },
  });

  const series = await prisma.series.upsert({
    where: { brandId_slug: { brandId: brand.id, slug: config.seriesSlug } },
    update: { name: config.collection },
    create: {
      brandId: brand.id,
      name: config.collection,
      slug: config.seriesSlug,
    },
  });

  const data = {
    productType: "WATCH" as const,
    brandId: brand.id,
    seriesId: series.id,
    model: config.model,
    reference: config.reference,
    description: rebuildWatchDescriptionFromRecord({
      model: config.model,
      reference: config.reference,
      category: config.category,
      collection: config.collection,
      bottleDetail: config.bottleDetail,
      liquidColor: config.liquidColor,
      longevity: config.longevity,
      bottleSize: config.bottleSize,
      condition: "UNWORN",
      brandName: config.brand,
      legacyDescription: config.description,
    }),
    conditionReport: config.conditionReport,
    price: config.priceGhs,
    costPriceGhs: 0,
    condition: "UNWORN" as const,
    year: 2026,
    fragranceFamily: "WOODY" as const,
    bottleMaterial: "METAL" as const,
    bottleDetail: config.bottleDetail,
    bottleSize: config.bottleSize,
    capType: "MAGNETIC" as const,
    liquidColor: config.liquidColor,
    longevity: config.longevity,
    bottleShape: config.category,
    concentration: "EDP" as const,
    topNotes: [] as string[],
    heartNotes: [] as string[],
    baseNotes: [] as string[],
    sillage: "MODERATE" as const,
    sustainabilityScore: 4,
    isVegan: false,
    isCrueltyFree: true,
    sampleAvailable: false,
    gender: config.gender,
    collection: config.collection,
    stock: STOCK_PER_BRANCH * Math.max(branches.length, 1),
    rating: 4.7,
    featured: config.featured ?? false,
    category: config.category,
  };

  const existing = await prisma.fragrance.findUnique({ where: { slug: config.slug } });
  const fragrance = existing
    ? await prisma.fragrance.update({ where: { slug: config.slug }, data })
    : await prisma.fragrance.create({ data: { ...data, slug: config.slug } });

  return { fragrance, branches };
}

async function main() {
  const targets = onlyKeys
    ? WATCHES.filter((w) => onlyKeys.has(w.key))
    : WATCHES;

  if (!targets.length) {
    console.error("No watches matched --only filter.");
    process.exit(1);
  }

  console.log(
    apply
      ? `Importing ${targets.length} watch(es)…`
      : `Dry run — ${targets.length} watch(es). Pass --apply to write.\n`
  );

  const imageResults: { config: WatchConfig; paths: string[] }[] = [];

  for (const config of targets) {
    console.log(`\n── ${config.brand} ${config.model} (${config.key})`);
    console.log(`   Price: ${config.priceGhs} GHS · Slug: ${config.slug}`);
    const entries = await config.getImages();
    console.log(`   Images: ${entries.length}`);
    const paths = await downloadWatchImagesFromEntries(entries, config.slug, apply);
    imageResults.push({ config, paths });
  }

  if (!apply) {
    console.log("\nDry run complete. Re-run with --apply to persist.");
    return;
  }

  const { prisma, disconnect } = createScriptPrisma();

  try {
    for (const { config, paths } of imageResults) {
      const { fragrance, branches } = await importWatch(config, prisma);

      await prisma.fragranceImage.deleteMany({ where: { fragranceId: fragrance.id } });
      if (paths.length) {
        await prisma.fragranceImage.createMany({
          data: paths.map((url, i) => ({
            fragranceId: fragrance.id,
            url,
            alt: `${config.brand} ${config.model} luxury watch`,
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

      console.log(`✓ ${config.brand} ${config.model} → /watches/${config.slug}`);
    }

    console.log(`\nDone — ${imageResults.length} watch(es) imported.`);
  } finally {
    await disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
