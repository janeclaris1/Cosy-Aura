/**
 * Batch import sunglasses from curated retailer URLs (Sep 2026).
 *
 * Usage:
 *   npx tsx scripts/import-sunglasses-batch-urls-sep15.ts
 *   npx tsx scripts/import-sunglasses-batch-urls-sep15.ts --apply
 *   npx tsx scripts/import-sunglasses-batch-urls-sep15.ts --only=versace-ve4489u-gb187 --apply
 */
import { createHash } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { BOTTLE_SIZES, type BottleSize } from "../src/lib/bottle-sizes";
import {
  descriptionSection,
  joinDescriptionSections,
  sanitizeDescriptionText,
} from "./lib/catalog-product-description";
import {
  discoverSequentialImageUrls,
  downloadSunglassesImagesFromUrls,
} from "./lib/catalog-image-import";
import { createScriptPrisma } from "./lib/script-prisma";
import { defaultCatalogCostPriceGhs } from "./lib/catalog-cost";
import { upsertBranchStockWithReceipt } from "./lib/import-inventory";

const apply = process.argv.includes("--apply");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const onlyKeys = onlyArg
  ? new Set(onlyArg.replace("--only=", "").split(",").map((s) => s.trim()))
  : null;

const STOCK_PER_BRANCH = 2;
const BARCODE_LEAD: Record<BottleSize, string> = { 30: "3", 50: "5", 100: "1" };
const FETCH_HEADERS = { "User-Agent": "CosyAuraCatalogImport/1.0" };

type ImageSource =
  | { kind: "urls"; urls: string[] }
  | { kind: "sh-za"; upc: string }
  | { kind: "glasses"; upc: string }
  | { kind: "flannels"; code: string }
  | { kind: "shopify"; jsonUrl: string; filter?: (url: string) => boolean }
  | { kind: "eyewearthese"; model: string; colorCode: string };

type SunglassesConfig = {
  key: string;
  sourceUrl: string;
  priceGhs: number;
  brand: string;
  model: string;
  reference: string;
  gender: "MENS" | "WOMENS" | "UNISEX";
  category: "Aviator" | "Wayfarer" | "Sport" | "Designer";
  frameColor: string;
  shape: string;
  collection: string;
  bottleSize: number;
  bridge: number;
  temple: number;
  bottleMaterial: "METAL" | "ACRYLIC";
  bottleDetail: string;
  liquidColor: string;
  longevity: string;
  imageSource: ImageSource;
  descriptionLead: string;
};

const SUNGLASSES: SunglassesConfig[] = [
  {
    key: "flannels-ve4361-oval",
    sourceUrl:
      "https://www.flannels.com/versace-mens-0ve4361-oval-sunglasses-754358#colcode=75435805",
    priceGhs: 300,
    brand: "Versace",
    model: "VE4361 Oval",
    reference: "VE4361 75435805",
    gender: "MENS",
    category: "Designer",
    frameColor: "Oval profile",
    shape: "Oval",
    collection: "Medusa Biggie",
    bottleSize: 53,
    bridge: 18,
    temple: 140,
    bottleMaterial: "ACRYLIC",
    bottleDetail: "Injected propionate oval frame with Medusa temple detail",
    liquidColor: "Dark grey lenses, Category 3",
    longevity: "100% UVA/UVB protection",
    imageSource: { kind: "flannels", code: "75435805" },
    descriptionLead:
      "Versace's oval Medusa Biggie silhouette — a softer curve on the house's bold acetate language.",
  },
  {
    key: "versace-ve4489u-gb187",
    sourceUrl: "https://www.sunglasshut.com/uk/versace/ve4489u-8056262451212",
    priceGhs: 320,
    brand: "Versace",
    model: "VE4489U Black/Dark Grey",
    reference: "VE4489U GB1/87",
    gender: "UNISEX",
    category: "Designer",
    frameColor: "Black",
    shape: "Geometric",
    collection: "Signature",
    bottleSize: 55,
    bridge: 18,
    temple: 140,
    bottleMaterial: "ACRYLIC",
    bottleDetail: "Lightweight injected frame with 3D metal lettering logo",
    liquidColor: "Dark grey lenses, non-polarised",
    longevity: "100% UVA/UVB protection",
    imageSource: {
      kind: "shopify",
      jsonUrl: "https://pretavoir.co.uk/products/versace-4489u-gb187.json",
      filter: (u) => u.includes("gb187-hd-"),
    },
    descriptionLead:
      "A narrow irregular front and wide temples — modern Versace confidence in a geometric profile.",
  },
  {
    key: "versace-ve4361-gb187",
    sourceUrl: "https://www.sunglasshut.com/us/versace/ve4361-8053672947397",
    priceGhs: 384,
    brand: "Versace",
    model: "VE4361 Black/Dark Grey",
    reference: "VE4361 GB1/87",
    gender: "UNISEX",
    category: "Designer",
    frameColor: "Black",
    shape: "Irregular",
    collection: "Medusa Biggie",
    bottleSize: 53,
    bridge: 18,
    temple: 140,
    bottleMaterial: "ACRYLIC",
    bottleDetail: "Thick acetate frame with gold-tone Medusa medallion temples",
    liquidColor: "Dark grey lenses, non-polarised",
    longevity: "100% UVA/UVB protection",
    imageSource: {
      kind: "shopify",
      jsonUrl: "https://pretavoir.co.uk/products/versace-ve4361-gb187.json",
      filter: (u) => u.includes("gb187-hd-"),
    },
    descriptionLead:
      "The Medusa Biggie icon — irregular hexagonal lenses and heritage medallion arms.",
  },
  {
    key: "versace-ve4480u-black",
    sourceUrl:
      "https://za.sunglasshut.com/products/versace/ve4480u-8056262222447/",
    priceGhs: 320,
    brand: "Versace",
    model: "VE4480U Black/Dark Grey",
    reference: "VE4480U",
    gender: "WOMENS",
    category: "Designer",
    frameColor: "Black",
    shape: "Oval",
    collection: "Signature",
    bottleSize: 55,
    bridge: 18,
    temple: 140,
    bottleMaterial: "ACRYLIC",
    bottleDetail: "Injected oval frame",
    liquidColor: "Dark grey polycarbonate lenses",
    longevity: "100% UVA/UVB protection",
    imageSource: { kind: "sh-za", upc: "8056262222447" },
    descriptionLead:
      "An elegant oval profile in polished black — refined Versace femininity for everyday wear.",
  },
  {
    key: "versace-ve4460d-havana",
    sourceUrl: "https://ikandisunglasses.com.au/products/versace-4460d-havana",
    priceGhs: 450,
    brand: "Versace",
    model: "VE4460D Havana",
    reference: "VE4460D 108/73",
    gender: "WOMENS",
    category: "Designer",
    frameColor: "Havana",
    shape: "Square",
    collection: "Medusa",
    bottleSize: 57,
    bridge: 18,
    temple: 140,
    bottleMaterial: "ACRYLIC",
    bottleDetail: "Acetate frame with Medusa head temple detail",
    liquidColor: "Brown gradient lenses",
    longevity: "100% UVA/UVB protection",
    imageSource: {
      kind: "shopify",
      jsonUrl: "https://ikandisunglasses.com.au/products/versace-4460d-havana.json",
    },
    descriptionLead:
      "The legendary Medusa head on an elegant acetate silhouette — bold Versace style refined.",
  },
  {
    key: "versace-ve4455u-gb187",
    sourceUrl: "https://www.sunglasshut.com/uk/versace/ve4455u-8056597920490",
    priceGhs: 280,
    brand: "Versace",
    model: "VE4455U Black/Dark Grey",
    reference: "VE4455U GB1/87",
    gender: "WOMENS",
    category: "Designer",
    frameColor: "Black",
    shape: "Oval",
    collection: "Medusa",
    bottleSize: 53,
    bridge: 19,
    temple: 140,
    bottleMaterial: "ACRYLIC",
    bottleDetail: "Polished acetate oval frame",
    liquidColor: "Dark grey lenses, Category 3",
    longevity: "100% UVA/UVB protection",
    imageSource: { kind: "glasses", upc: "8056597920490" },
    descriptionLead:
      "A polished black oval with dark grey lenses — timeless Versace elegance.",
  },
  {
    key: "versace-ve4430u-bluette",
    sourceUrl: "https://www.sunglasshut.com/us/versace/ve4430u-8056597724388",
    priceGhs: 260,
    brand: "Versace",
    model: "VE4430U Bluette/Dark Grey",
    reference: "VE4430U 529487",
    gender: "MENS",
    category: "Designer",
    frameColor: "Bluette",
    shape: "Rectangle",
    collection: "Iconic",
    bottleSize: 53,
    bridge: 20,
    temple: 140,
    bottleMaterial: "ACRYLIC",
    bottleDetail: "Injected rectangular frame, universal fit",
    liquidColor: "Dark grey polyamide lenses",
    longevity: "100% UVA/UVB protection",
    imageSource: { kind: "sh-za", upc: "8056597724388" },
    descriptionLead:
      "Cool bluette acetate in a clean rectangle — understated Versace structure with grey lenses.",
  },
  {
    key: "versace-ve4361-536087",
    sourceUrl: "https://www.sunglasshut.com/us/versace/ve4361-8056597657778",
    priceGhs: 384,
    brand: "Versace",
    model: "VE4361 Black/Grey",
    reference: "VE4361 536087",
    gender: "UNISEX",
    category: "Designer",
    frameColor: "Black",
    shape: "Irregular",
    collection: "Medusa Biggie",
    bottleSize: 53,
    bridge: 18,
    temple: 140,
    bottleMaterial: "ACRYLIC",
    bottleDetail: "Low-lens Biggie shape with gold Medusa medallion temples",
    liquidColor: "Grey lenses, non-polarised",
    longevity: "100% UVA/UVB protection",
    imageSource: { kind: "glasses", upc: "8056597657778" },
    descriptionLead:
      "A fluorescent-toned Medusa Biggie — thick black acetate with heritage medallion arms.",
  },
  {
    key: "versace-ve4425u-536887",
    sourceUrl: "https://hallofframescompany.com/products/4425u-536887",
    priceGhs: 363,
    brand: "Versace",
    model: "VE4425U Blue/Dark Grey",
    reference: "VE4425U 5368/87",
    gender: "UNISEX",
    category: "Designer",
    frameColor: "Blue",
    shape: "Square",
    collection: "Maxi Medusa Biggie",
    bottleSize: 53,
    bridge: 18,
    temple: 145,
    bottleMaterial: "ACRYLIC",
    bottleDetail: "Maxi Medusa Biggie acetate frame",
    liquidColor: "Dark grey lenses",
    longevity: "100% UVA/UVB protection",
    imageSource: {
      kind: "shopify",
      jsonUrl: "https://hallofframescompany.com/products/4425u-536887.json",
    },
    descriptionLead:
      "Maxi Medusa Biggie attitude in a bold blue acetate square — statement luxury eyewear.",
  },
  {
    key: "versace-ve2260-100284",
    sourceUrl:
      "https://globaleyes.co.za/product/versace-sunglasses-2260-1002-84-60/",
    priceGhs: 310,
    brand: "Versace",
    model: "VE2260 Gold/Pink",
    reference: "VE2260 1002/84",
    gender: "UNISEX",
    category: "Aviator",
    frameColor: "Gold",
    shape: "Aviator",
    collection: "Pilot",
    bottleSize: 60,
    bridge: 16,
    temple: 140,
    bottleMaterial: "METAL",
    bottleDetail: "Metal pilot frame with double bridge and Medusa temple detail",
    liquidColor: "Pink lenses, Category 3",
    longevity: "100% UVA/UVB protection",
    imageSource: { kind: "eyewearthese", model: "VE2260", colorCode: "100284" },
    descriptionLead:
      "A metal aviator with tubular temples and Medusa detail — pilot heritage meets Versace boldness.",
  },
  {
    key: "versace-ve4459-havana",
    sourceUrl:
      "https://za.sunglasshut.com/products/versace/ve4459-8056597922234/",
    priceGhs: 310,
    brand: "Versace",
    model: "VE4459 Havana/Dark Grey",
    reference: "VE4459 Havana",
    gender: "UNISEX",
    category: "Designer",
    frameColor: "Havana",
    shape: "Rectangle",
    collection: "Medusa",
    bottleSize: 54,
    bridge: 18,
    temple: 140,
    bottleMaterial: "ACRYLIC",
    bottleDetail: "Acetate rectangle with metal temple decor",
    liquidColor: "Dark grey bio polyamide lenses",
    longevity: "100% UVA/UVB protection",
    imageSource: { kind: "sh-za", upc: "8056597922234" },
    descriptionLead:
      "Havana acetate and dark grey lenses — the VE4459 rectangle with signature metal temple detail.",
  },
  {
    key: "versace-ve4486-black",
    sourceUrl: "https://www.sunglasshut.com/us/versace/ve4486-8056262415108",
    priceGhs: 323,
    brand: "Versace",
    model: "VE4486 Black/Dark Grey",
    reference: "VE4486",
    gender: "MENS",
    category: "Designer",
    frameColor: "Black",
    shape: "Square",
    collection: "Signature",
    bottleSize: 52,
    bridge: 19,
    temple: 140,
    bottleMaterial: "ACRYLIC",
    bottleDetail: "Polished black acetate square frame, high bridge fit",
    liquidColor: "Dark grey lenses, Category 3",
    longevity: "100% UVA/UVB protection",
    imageSource: { kind: "sh-za", upc: "8056262415108" },
    descriptionLead:
      "A polished black square with solid grey lenses — structured Versace sophistication.",
  },
  {
    key: "versace-ve4465-gb187",
    sourceUrl:
      "https://za.sunglasshut.com/products/versace/ve4465-8056262013960/",
    priceGhs: 350,
    brand: "Versace",
    model: "VE4465 Black/Dark Grey",
    reference: "VE4465 GB1/87",
    gender: "MENS",
    category: "Designer",
    frameColor: "Black",
    shape: "Rectangle",
    collection: "Medusa",
    bottleSize: 53,
    bridge: 18,
    temple: 145,
    bottleMaterial: "ACRYLIC",
    bottleDetail: "Recycled acetate rectangle, high bridge fit",
    liquidColor: "Dark grey bio polyamide lenses",
    longevity: "100% UVA/UVB protection",
    imageSource: { kind: "sh-za", upc: "8056262013960" },
    descriptionLead:
      "Clean rectangular lines in black acetate — Versace luxury with everyday versatility.",
  },
  {
    key: "prada-pr-14ys-black",
    sourceUrl: "https://www.sunglasshut.com/au/prada/pr-14ys-8056597627375",
    priceGhs: 420,
    brand: "Prada",
    model: "PR 14YS Black/Dark Grey",
    reference: "PR 14YS 1AB5S0",
    gender: "WOMENS",
    category: "Designer",
    frameColor: "Black",
    shape: "Rectangle",
    collection: "Prada Eyewear",
    bottleSize: 53,
    bridge: 19,
    temple: 140,
    bottleMaterial: "ACRYLIC",
    bottleDetail: "Full-rim acetate rectangle",
    liquidColor: "Dark grey solid lenses",
    longevity: "100% UVA/UVB protection",
    imageSource: { kind: "sh-za", upc: "8056597627375" },
    descriptionLead:
      "Prada's polished black rectangle — fashion-forward optical excellence in a timeless silhouette.",
  },
  {
    key: "prada-pr-c01sd-black-polarized",
    sourceUrl: "https://www.eyeons.com/products/prada-pr-c01sd",
    priceGhs: 450,
    brand: "Prada",
    model: "PR C01SD Black/Green Polarized",
    reference: "PR C01SD 16K04D",
    gender: "MENS",
    category: "Designer",
    frameColor: "Black",
    shape: "Cat-Eye",
    collection: "Prada Eyewear",
    bottleSize: 52,
    bridge: 23,
    temple: 145,
    bottleMaterial: "ACRYLIC",
    bottleDetail: "Full-rim acetate cat-eye frame",
    liquidColor: "Green polarised lenses",
    longevity: "100% UVA/UVB protection",
    imageSource: {
      kind: "shopify",
      jsonUrl: "https://www.eyeons.com/products/prada-pr-c01sd.json",
      filter: (u) => u.endsWith(".webp") && !u.includes("logo"),
    },
    descriptionLead:
      "A sharp cat-eye in black acetate with green polarised lenses — Prada's geometric Italian artistry.",
  },
  {
    key: "prada-pr-26zs-symbole-black",
    sourceUrl:
      "https://www.farfetch.com/gh/shopping/men/prada-eyewear-symbole-sunglasses-item-19896402.aspx",
    priceGhs: 350,
    brand: "Prada",
    model: "Symbole Oval Black/Grey",
    reference: "PR 26ZS 16K08Z",
    gender: "UNISEX",
    category: "Designer",
    frameColor: "Black",
    shape: "Oval",
    collection: "Symbole",
    bottleSize: 55,
    bridge: 16,
    temple: 145,
    bottleMaterial: "ACRYLIC",
    bottleDetail: "Oval acetate frame with triangle logo temples",
    liquidColor: "Grey tinted lenses, Category 3",
    longevity: "100% UVA/UVB protection",
    imageSource: {
      kind: "shopify",
      jsonUrl:
        "https://solsticesunglasses.com/products/prada-0pr-26zs-16k08z-oval-sunglasses.json",
    },
    descriptionLead:
      "Prada Symbole oval frames — faceted temples and the iconic triangle logo in pure black acetate.",
  },
  {
    key: "celine-cl000312-black",
    sourceUrl: "https://www.sunglasshut.com/uk/celine/cl000312-192337081071",
    priceGhs: 410,
    brand: "Celine",
    model: "CL000312 Black/Grey",
    reference: "CL000312",
    gender: "WOMENS",
    category: "Designer",
    frameColor: "Black",
    shape: "Oval",
    collection: "Triomphe",
    bottleSize: 52,
    bridge: 22,
    temple: 145,
    bottleMaterial: "ACRYLIC",
    bottleDetail: "Acetate oval frame",
    liquidColor: "Grey classic polycarbonate lenses",
    longevity: "100% UVA/UVB protection",
    imageSource: { kind: "sh-za", upc: "192337081071" },
    descriptionLead:
      "Celine's understated oval in black acetate — Parisian minimalism with grey sun lenses.",
  },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function productSlug(config: SunglassesConfig): string {
  return slugify(`${config.brand}-${config.model}-${config.reference}`);
}

function buildDescription(config: SunglassesConfig): string {
  return sanitizeDescriptionText(
    joinDescriptionSections(
      config.descriptionLead,
      `Reference ${config.reference}. Lightweight, full-rim ${config.shape.toLowerCase()} sunglasses designed for everyday wear with a polished finish.`,
      descriptionSection("Frame", [
        `Colour: ${config.frameColor}`,
        `Material: ${config.bottleMaterial === "METAL" ? "Metal" : "Acetate"}`,
        `Measurements: ${config.bottleSize}-${config.bridge}-${config.temple} mm`,
        config.bottleDetail,
      ]),
      descriptionSection("Lenses", [config.liquidColor, config.longevity]),
      "Includes branded case. Condition: New, unworn."
    )
  );
}

async function resolveShZaImages(upc: string): Promise<string[]> {
  const suffixes = ["000A", "030A", "060A", "090A", "120A"];
  const urls = suffixes.map(
    (s) =>
      `https://za.sunglasshut.com/wordpress/wp-content/themes/sunglasshut/assets/product_images/${upc}_${s}.jpg`
  );
  const results: string[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: "HEAD", headers: FETCH_HEADERS });
      if (res.ok) results.push(url);
    } catch {
      /* skip */
    }
  }
  return results;
}

async function resolveGlassesComImages(upc: string): Promise<string[]> {
  const results: string[] = [];
  for (let i = 1; i <= 4; i++) {
    const n = String(i).padStart(3, "0");
    const url = `https://assets.glasses.com/is/image/Glasses/${upc}__${n}.png`;
    try {
      const res = await fetch(url, { method: "HEAD", headers: FETCH_HEADERS });
      if (res.ok) results.push(url);
    } catch {
      /* skip */
    }
  }
  return results;
}

async function resolveFlannelsImages(code: string): Promise<string[]> {
  return discoverSequentialImageUrls((index) => {
    const suffixes = ["l", "b", "f", "d", "e", "m"];
    const suffix = suffixes[index] ?? `x${index}`;
    return `https://images.flannels.com/images/products/${code}_${suffix}.jpg`;
  }, 6);
}

async function resolveShopifyImages(
  jsonUrl: string,
  filter?: (url: string) => boolean
): Promise<string[]> {
  const res = await fetch(jsonUrl, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`Shopify JSON failed: ${jsonUrl}`);
  const data = (await res.json()) as {
    product: { images: Array<{ src: string }> };
  };
  let urls = data.product.images.map((img) => img.src.split("?")[0]);
  if (filter) urls = urls.filter(filter);
  return [...new Set(urls)].slice(0, 8);
}

async function resolveEyeweartheseImages(
  model: string,
  colorCode: string
): Promise<string[]> {
  const code = model.replace(/^0?VE/i, "VE").replace("-", "");
  const luxotticaModel = code.startsWith("VE") ? `0${code}` : code;
  const angles = ["fr", "qt", "lt", "bk", "cfr"];
  const results: string[] = [];
  for (const angle of angles) {
    const url = `https://eyewearthese.com/wp-content/uploads/2024/03/${luxotticaModel}__${colorCode}__P21__shad__${angle}.jpg`;
    try {
      const res = await fetch(url, { method: "HEAD", headers: FETCH_HEADERS });
      if (res.ok) results.push(url);
    } catch {
      /* skip */
    }
  }
  return results;
}

async function resolveImages(source: ImageSource): Promise<string[]> {
  switch (source.kind) {
    case "urls":
      return source.urls;
    case "sh-za":
      return resolveShZaImages(source.upc);
    case "glasses":
      return resolveGlassesComImages(source.upc);
    case "flannels":
      return resolveFlannelsImages(source.code);
    case "shopify":
      return resolveShopifyImages(source.jsonUrl, source.filter);
    case "eyewearthese":
      return resolveEyeweartheseImages(source.model, source.colorCode);
  }
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

async function importSunglasses(
  config: SunglassesConfig,
  imageUrls: string[],
  prisma: PrismaClient
) {
  const slug = productSlug(config);
  const brandSlug = slugify(config.brand);

  const branches = await prisma.branch.findMany({
    where: { active: true, country: "GH" },
    select: { id: true, name: true, country: true },
  });

  const brand = await prisma.brand.upsert({
    where: { slug: brandSlug },
    update: { name: config.brand },
    create: { name: config.brand, slug: brandSlug },
  });

  const data = {
    productType: "SUNGLASSES" as const,
    brandId: brand.id,
    model: config.model,
    reference: config.reference,
    description: buildDescription(config),
    conditionReport: "New with case. Unworn. Authentic designer sunglasses.",
    price: config.priceGhs,
    costPriceGhs: defaultCatalogCostPriceGhs("SUNGLASSES", config.bottleSize ?? 50),
    condition: "UNWORN" as const,
    year: 2026,
    fragranceFamily: "FRESH" as const,
    bottleMaterial: config.bottleMaterial,
    bottleDetail: config.bottleDetail,
    bottleSize: config.bottleSize,
    capType: "SCREW" as const,
    liquidColor: config.liquidColor,
    longevity: config.longevity,
    bottleShape: config.shape,
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
    rating: 4.7,
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
        alt: `${config.brand} ${config.model} sunglasses`,
        isPrimary: i === 0,
        sortOrder: i,
      })),
    });
  }

  await ensureBarcodes(prisma, fragrance.id);

  const productLabel = `${config.brand} ${config.model}`;
  for (const branch of branches) {
    await upsertBranchStockWithReceipt(prisma, {
      apply,
      branch,
      fragranceId: fragrance.id,
      bottleSize: 50,
      quantity: STOCK_PER_BRANCH,
      productLabel,
    });
  }

  for (const country of ["GH", "CM"] as const) {
    await syncCountryPool(prisma, fragrance.id, country);
  }

  return { fragrance, slug };
}

async function main() {
  const targets = onlyKeys
    ? SUNGLASSES.filter((s) => onlyKeys.has(s.key))
    : SUNGLASSES;

  if (!targets.length) {
    console.error("No sunglasses matched --only filter.");
    process.exit(1);
  }

  console.log(
    apply
      ? `Importing ${targets.length} sunglasses…`
      : `Dry run — ${targets.length} sunglasses. Pass --apply to write.\n`
  );

  for (const config of targets) {
    const slug = productSlug(config);
    let images: string[] = [];
    try {
      images = await resolveImages(config.imageSource);
    } catch (error) {
      console.warn(`   ⚠ Image resolve failed: ${error}`);
    }
    console.log(`\n── ${config.brand} ${config.model} (${config.key})`);
    console.log(`   Price: ${config.priceGhs} GHS · Category: ${config.category}`);
    console.log(`   Source: ${config.sourceUrl}`);
    console.log(`   Slug: ${slug}`);
    console.log(`   Images: ${images.length} angle(s)`);
    for (const url of images) {
      console.log(`     · ${url}`);
    }
    if (!images.length) {
      console.warn(`   ⚠ No images found — will skip on --apply`);
    }
  }

  if (!apply) {
    console.log("\nDry run complete. Re-run with --apply to persist.");
    return;
  }

  const { prisma, disconnect } = createScriptPrisma();

  try {
    let imported = 0;
    for (const config of targets) {
      const slug = productSlug(config);
      let sourceImages: string[] = [];
      try {
        sourceImages = await resolveImages(config.imageSource);
      } catch (error) {
        console.warn(`⚠ Skipping ${config.key} — ${error}`);
        continue;
      }
      if (!sourceImages.length) {
        console.warn(`⚠ Skipping ${config.key} — no images`);
        continue;
      }

      const cloudUrls = await downloadSunglassesImagesFromUrls(
        sourceImages,
        slug,
        true
      );

      await importSunglasses(config, cloudUrls.filter(Boolean), prisma);
      console.log(
        `✓ ${config.brand} ${config.model} → /sunglasses/${slug} (${cloudUrls.length} image(s))`
      );
      imported++;
    }

    console.log(`\nDone — ${imported}/${targets.length} sunglasses imported.`);
  } finally {
    await disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
