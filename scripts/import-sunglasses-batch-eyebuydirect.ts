/**
 * Batch import RALPH by Ralph Lauren sunglasses (EyeBuyDirect catalog metadata).
 * Product data is curated manually because EyeBuyDirect blocks automated scraping;
 * images are fetched from img.ebdcdn.com.
 *
 * Usage:
 *   npx tsx scripts/import-sunglasses-batch-eyebuydirect.ts
 *   npx tsx scripts/import-sunglasses-batch-eyebuydirect.ts --apply
 *   npx tsx scripts/import-sunglasses-batch-eyebuydirect.ts --only=ra5293-shiny-black --apply
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

const apply = process.argv.includes("--apply");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const onlyKeys = onlyArg
  ? new Set(onlyArg.replace("--only=", "").split(",").map((s) => s.trim()))
  : null;

const STOCK_PER_BRANCH = 2;
const BARCODE_LEAD: Record<BottleSize, string> = { 30: "3", 50: "5", 100: "1" };
const EBD_CDN = (imageKey: string, index = 0) =>
  `https://img.ebdcdn.com/product/frame/gray/${imageKey}_${index}.jpg`;

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
  imageKey: string;
  descriptionLead: string;
};

const SUNGLASSES: SunglassesConfig[] = [
  {
    key: "ra4004-gold",
    sourceUrl:
      "https://www.eyebuydirect.com/sunglasses/frames/ralph-ra4004-gold-l-28819",
    priceGhs: 285,
    brand: "Ralph Lauren",
    model: "RA4004 Gold",
    reference: "RA4004",
    gender: "WOMENS",
    category: "Aviator",
    frameColor: "Gold",
    shape: "Aviator",
    collection: "RALPH",
    bottleSize: 59,
    bridge: 13,
    temple: 130,
    bottleMaterial: "METAL",
    bottleDetail:
      "Gold metal aviator · Full rim · 59-13-130 · Adjustable nose pads · Branded case",
    liquidColor: "Brown gradient · Premium sun lenses",
    longevity: "100% UVA/UVB protection",
    imageKey: "lusmt02564",
    descriptionLead:
      "A timeless aviator in polished gold metal — refined enough for city lunches, easy enough for weekend drives.",
  },
  {
    key: "ra4004-shiny-gold",
    sourceUrl:
      "https://www.eyebuydirect.com/sunglasses/frames/ralph-ra4004-shiny-gold-l-28820",
    priceGhs: 295,
    brand: "Ralph Lauren",
    model: "RA4004 Shiny Gold",
    reference: "RA4004",
    gender: "WOMENS",
    category: "Aviator",
    frameColor: "Shiny Gold",
    shape: "Aviator",
    collection: "RALPH",
    bottleSize: 59,
    bridge: 13,
    temple: 130,
    bottleMaterial: "METAL",
    bottleDetail:
      "Shiny gold metal aviator · Full rim · 59-13-130 · Adjustable nose pads · Branded case",
    liquidColor: "Brown gradient · Premium sun lenses",
    longevity: "100% UVA/UVB protection",
    imageKey: "lusmt02819",
    descriptionLead:
      "High-shine gold aviators with a classic teardrop silhouette — the kind of frame that instantly elevates a simple outfit.",
  },
  {
    key: "ra4147-silver",
    sourceUrl:
      "https://www.eyebuydirect.com/sunglasses/frames/ralph-ra4147-silver-l-30519",
    priceGhs: 320,
    brand: "Ralph Lauren",
    model: "RA4147 Silver",
    reference: "RA4147",
    gender: "WOMENS",
    category: "Designer",
    frameColor: "Silver",
    shape: "Cat eye",
    collection: "RALPH",
    bottleSize: 58,
    bridge: 16,
    temple: 145,
    bottleMaterial: "METAL",
    bottleDetail:
      "Silver metal cat-eye · Full rim · 58-16-145 · Adjustable nose pads · Low nose bridge fit",
    liquidColor: "Purple tint · Premium sun lenses",
    longevity: "100% UVA/UVB protection",
    imageKey: "lusmt03039",
    descriptionLead:
      "Sculpted cat-eye lines in cool silver metal, finished with a soft purple lens tint for a playful, polished look.",
  },
  {
    key: "ra5138-tortoise-blue",
    sourceUrl:
      "https://www.eyebuydirect.com/sunglasses/frames/ralph-ra5138-shiny-tortoise-blue-l-28821",
    priceGhs: 305,
    brand: "Ralph Lauren",
    model: "RA5138 Shiny Tortoise Blue",
    reference: "RA5138",
    gender: "WOMENS",
    category: "Designer",
    frameColor: "Shiny Tortoise Blue",
    shape: "Cat eye",
    collection: "RALPH",
    bottleSize: 58,
    bridge: 16,
    temple: 135,
    bottleMaterial: "ACRYLIC",
    bottleDetail:
      "Two-tone tortoise and light blue acetate · Cat-eye · 58-16-135 · Gold temple accent · Branded case",
    liquidColor: "Brown gradient · Premium sun lenses",
    longevity: "100% UVA/UVB protection",
    imageKey: "luspl02566",
    descriptionLead:
      "Layered tortoise and sky-blue acetate with a subtle cat-eye lift — statement colour without losing everyday wearability.",
  },
  {
    key: "ra5201-dark-floral",
    sourceUrl:
      "https://www.eyebuydirect.com/sunglasses/frames/ralph-ra5201-dark-floral-l-29361",
    priceGhs: 335,
    brand: "Ralph Lauren",
    model: "RA5201 Dark Floral",
    reference: "RA5201",
    gender: "WOMENS",
    category: "Designer",
    frameColor: "Dark Floral",
    shape: "Cat eye",
    collection: "RALPH",
    bottleSize: 54,
    bridge: 17,
    temple: 135,
    bottleMaterial: "ACRYLIC",
    bottleDetail:
      "Dark floral acetate · Cat-eye · 54-17-135 · Pink metal temples · High base curve · Branded case",
    liquidColor: "Grey gradient · Premium sun lenses",
    longevity: "100% UVA/UVB protection",
    imageKey: "luspl02889",
    descriptionLead:
      "Heritage-inspired cat-eye frames in a moody floral acetate, paired with contrasting pink metal arms for a modern twist.",
  },
  {
    key: "ra5203-black-gold",
    sourceUrl:
      "https://www.eyebuydirect.com/sunglasses/frames/ralph-ra5203-shiny-black-gold-l-28650",
    priceGhs: 315,
    brand: "Ralph Lauren",
    model: "RA5203 Shiny Black Gold",
    reference: "RA5203",
    gender: "WOMENS",
    category: "Designer",
    frameColor: "Shiny Black Gold",
    shape: "Cat eye",
    collection: "RALPH",
    bottleSize: 54,
    bridge: 16,
    temple: 135,
    bottleMaterial: "ACRYLIC",
    bottleDetail:
      "Black and gold acetate cat-eye · Full rim · 54-16-135 · Branded case & cloth",
    liquidColor: "Brown gradient · Premium sun lenses",
    longevity: "100% UVA/UVB protection",
    imageKey: "luspl02568",
    descriptionLead:
      "Sharp cat-eye proportions in glossy black acetate with gold accents — dressy, feminine, and unmistakably refined.",
  },
  {
    key: "ra5203-ivory-tortoise-gold",
    sourceUrl:
      "https://www.eyebuydirect.com/sunglasses/frames/ralph-ra5203-ivory-tortoise-gold-l-28652",
    priceGhs: 325,
    brand: "Ralph Lauren",
    model: "RA5203 Ivory Tortoise Gold",
    reference: "RA5203",
    gender: "WOMENS",
    category: "Designer",
    frameColor: "Ivory Tortoise Gold",
    shape: "Cat eye",
    collection: "RALPH",
    bottleSize: 54,
    bridge: 16,
    temple: 135,
    bottleMaterial: "ACRYLIC",
    bottleDetail:
      "Ivory tortoise acetate cat-eye · Full rim · 54-16-135 · Branded case & cloth",
    liquidColor: "Brown gradient · Premium sun lenses",
    longevity: "100% UVA/UVB protection",
    imageKey: "luspl02569",
    descriptionLead:
      "Soft ivory tortoise acetate in a flattering cat-eye shape — warm, romantic, and perfect for garden parties or beachside brunches.",
  },
  {
    key: "ra5274-shiny-black",
    sourceUrl:
      "https://www.eyebuydirect.com/sunglasses/frames/ralph-ra5274-shiny-black-l-28654",
    priceGhs: 275,
    brand: "Ralph Lauren",
    model: "RA5274 Shiny Black",
    reference: "RA5274",
    gender: "WOMENS",
    category: "Designer",
    frameColor: "Shiny Black",
    shape: "Cat eye",
    collection: "RALPH",
    bottleSize: 56,
    bridge: 16,
    temple: 140,
    bottleMaterial: "ACRYLIC",
    bottleDetail:
      "Shiny black plastic cat-eye · Full rim · 56-16-140 · Lightweight 19g · Branded case",
    liquidColor: "Grey gradient · Premium sun lenses",
    longevity: "100% UVA/UVB protection",
    imageKey: "luspl02572",
    descriptionLead:
      "Sleek black cat-eye frames with a hint of retro glamour — lightweight, confident, and ready for sunny Accra afternoons.",
  },
  {
    key: "ra5293-shiny-black",
    sourceUrl:
      "https://www.eyebuydirect.com/sunglasses/frames/ralph-ra5293-shiny-black-l-28655",
    priceGhs: 290,
    brand: "Ralph Lauren",
    model: "RA5293 Shiny Black",
    reference: "RA5293",
    gender: "WOMENS",
    category: "Wayfarer",
    frameColor: "Shiny Black",
    shape: "Square",
    collection: "RALPH",
    bottleSize: 56,
    bridge: 16,
    temple: 145,
    bottleMaterial: "ACRYLIC",
    bottleDetail:
      "Shiny black acetate square · Full rim · 56-16-145 · Lightweight · Branded case",
    liquidColor: "Green gradient · Premium sun lenses",
    longevity: "100% UVA/UVB protection",
    imageKey: "luspl02555",
    descriptionLead:
      "Structured square frames with clean angles and a glossy black finish — modern, graphic, and endlessly versatile.",
  },
  {
    key: "ra5294u-black",
    sourceUrl:
      "https://www.eyebuydirect.com/sunglasses/frames/ralph-ra5294u-black-l-30093",
    priceGhs: 265,
    brand: "Ralph Lauren",
    model: "RA5294U Black",
    reference: "RA5294U",
    gender: "WOMENS",
    category: "Designer",
    frameColor: "Shiny Black",
    shape: "Round",
    collection: "RALPH",
    bottleSize: 53,
    bridge: 19,
    temple: 145,
    bottleMaterial: "ACRYLIC",
    bottleDetail:
      "Shiny black injected round · Full rim · 53-19-145 · Universal fit · Branded case",
    liquidColor: "Grey gradient · Premium sun lenses",
    longevity: "100% UVA/UVB protection",
    imageKey: "lupl03093",
    descriptionLead:
      "Soft round lenses in a glossy black frame — an easy everyday pair that still feels distinctly designer.",
  },
  {
    key: "ra5298u-clear-brown",
    sourceUrl:
      "https://www.eyebuydirect.com/sunglasses/frames/ralph-ra5298u-clear-brown-l-28658",
    priceGhs: 340,
    brand: "Ralph Lauren",
    model: "RA5298U Clear Brown",
    reference: "RA5298U",
    gender: "WOMENS",
    category: "Wayfarer",
    frameColor: "Clear Brown",
    shape: "Rectangular",
    collection: "RALPH",
    bottleSize: 55,
    bridge: 17,
    temple: 145,
    bottleMaterial: "ACRYLIC",
    bottleDetail:
      "Clear brown acetate rectangular · Full rim · 55-17-145 · Universal fit · Branded case",
    liquidColor: "Grey gradient polarized · Premium sun lenses",
    longevity: "100% UVA/UVB protection · Polarized",
    imageKey: "luspl02558",
    descriptionLead:
      "Translucent brown acetate with a sharp rectangular silhouette — polished enough for the office, relaxed enough for travel.",
  },
  {
    key: "ra5302u-tortoise",
    sourceUrl:
      "https://www.eyebuydirect.com/sunglasses/frames/ralph-ra5302u-tortoise-l-30094",
    priceGhs: 310,
    brand: "Ralph Lauren",
    model: "RA5302U Tortoise",
    reference: "RA5302U",
    gender: "WOMENS",
    category: "Designer",
    frameColor: "Tortoise",
    shape: "Round",
    collection: "RALPH",
    bottleSize: 54,
    bridge: 18,
    temple: 145,
    bottleMaterial: "ACRYLIC",
    bottleDetail:
      "Tortoise acetate round · Full rim · 54-18-145 · Branded case",
    liquidColor: "Grey gradient · Premium sun lenses",
    longevity: "100% UVA/UVB protection",
    imageKey: "lupl03094",
    descriptionLead:
      "Classic round lenses in warm tortoise acetate — a heritage shape updated with contemporary finishing.",
  },
  {
    key: "ra5302u-nude-tortoise",
    sourceUrl:
      "https://www.eyebuydirect.com/sunglasses/frames/ralph-ra5302u-nude-tortoise-l-30095",
    priceGhs: 300,
    brand: "Ralph Lauren",
    model: "RA5302U Nude Tortoise",
    reference: "RA5302U",
    gender: "WOMENS",
    category: "Designer",
    frameColor: "Nude Tortoise",
    shape: "Round",
    collection: "RALPH",
    bottleSize: 54,
    bridge: 18,
    temple: 145,
    bottleMaterial: "ACRYLIC",
    bottleDetail:
      "Nude tortoise acetate round · Full rim · 54-18-145 · Branded case",
    liquidColor: "Brown gradient · Premium sun lenses",
    longevity: "100% UVA/UVB protection",
    imageKey: "luspl03095",
    descriptionLead:
      "Muted nude tortoise in a soft round profile — understated luxury that pairs with everything from linen to leather.",
  },
  {
    key: "ra5303u-black",
    sourceUrl:
      "https://www.eyebuydirect.com/sunglasses/frames/ralph-ra5303u-black-l-30096",
    priceGhs: 280,
    brand: "Ralph Lauren",
    model: "RA5303U Black",
    reference: "RA5303U",
    gender: "WOMENS",
    category: "Designer",
    frameColor: "Shiny Black",
    shape: "Irregular",
    collection: "RALPH",
    bottleSize: 55,
    bridge: 16,
    temple: 145,
    bottleMaterial: "ACRYLIC",
    bottleDetail:
      "Shiny black acetate irregular · Full rim · 55-16-145 · Branded case",
    liquidColor: "Grey gradient · Premium sun lenses",
    longevity: "100% UVA/UVB protection",
    imageKey: "luspl03096",
    descriptionLead:
      "An artful irregular silhouette in glossy black acetate — fashion-forward without feeling overdone.",
  },
  {
    key: "ra5303u-dark-havana",
    sourceUrl:
      "https://www.eyebuydirect.com/sunglasses/frames/ralph-ra5303u-shiny-dark-havana-l-30097",
    priceGhs: 290,
    brand: "Ralph Lauren",
    model: "RA5303U Shiny Dark Havana",
    reference: "RA5303U",
    gender: "WOMENS",
    category: "Designer",
    frameColor: "Shiny Dark Havana",
    shape: "Irregular",
    collection: "RALPH",
    bottleSize: 55,
    bridge: 16,
    temple: 145,
    bottleMaterial: "ACRYLIC",
    bottleDetail:
      "Dark havana acetate irregular · Full rim · 55-16-145 · Branded case",
    liquidColor: "Brown gradient · Premium sun lenses",
    longevity: "100% UVA/UVB protection",
    imageKey: "luspl03097",
    descriptionLead:
      "Rich dark havana acetate in a sculptural irregular shape — warm, refined, and made for golden-hour light.",
  },
  {
    key: "ra5305u-shiny-brown",
    sourceUrl:
      "https://www.eyebuydirect.com/sunglasses/frames/ralph-ra5305u-shiny-solid-brown-l-28659",
    priceGhs: 305,
    brand: "Ralph Lauren",
    model: "RA5305U Shiny Solid Brown",
    reference: "RA5305U",
    gender: "WOMENS",
    category: "Designer",
    frameColor: "Shiny Solid Brown",
    shape: "Cat eye",
    collection: "RALPH",
    bottleSize: 56,
    bridge: 17,
    temple: 145,
    bottleMaterial: "ACRYLIC",
    bottleDetail:
      "Shiny solid brown acetate cat-eye · Full rim · 56-17-145 · Low nose bridge · Branded case",
    liquidColor: "Brown gradient · Premium sun lenses",
    longevity: "100% UVA/UVB protection",
    imageKey: "luspl02581",
    descriptionLead:
      "Warm brown acetate cat-eye frames with a subtle lift at the corners — elegant sun coverage with everyday comfort.",
  },
  {
    key: "ra5306u-purple",
    sourceUrl:
      "https://www.eyebuydirect.com/sunglasses/frames/ralph-ra5306u-purple-s-30098",
    priceGhs: 255,
    brand: "Ralph Lauren",
    model: "RA5306U Purple",
    reference: "RA5306U",
    gender: "WOMENS",
    category: "Designer",
    frameColor: "Purple",
    shape: "Round",
    collection: "RALPH",
    bottleSize: 52,
    bridge: 18,
    temple: 140,
    bottleMaterial: "ACRYLIC",
    bottleDetail:
      "Purple acetate round · Full rim · Small fit · Branded case",
    liquidColor: "Grey gradient · Premium sun lenses",
    longevity: "100% UVA/UVB protection",
    imageKey: "lupl03098",
    descriptionLead:
      "A pop of purple in a compact round frame — playful colour for days when your outfit needs a finishing touch.",
  },
  {
    key: "ra5307u-clear",
    sourceUrl:
      "https://www.eyebuydirect.com/sunglasses/frames/ralph-ra5307u-clear-m-30099",
    priceGhs: 260,
    brand: "Ralph Lauren",
    model: "RA5307U Clear",
    reference: "RA5307U",
    gender: "WOMENS",
    category: "Designer",
    frameColor: "Clear",
    shape: "Round",
    collection: "RALPH",
    bottleSize: 54,
    bridge: 18,
    temple: 145,
    bottleMaterial: "ACRYLIC",
    bottleDetail:
      "Clear acetate round · Full rim · Medium fit · Branded case",
    liquidColor: "Grey gradient · Premium sun lenses",
    longevity: "100% UVA/UVB protection",
    imageKey: "lupl03099",
    descriptionLead:
      "Crystal-clear acetate with soft round lenses — minimal, modern, and easy to style with any wardrobe palette.",
  },
  {
    key: "ra5313u-green",
    sourceUrl:
      "https://www.eyebuydirect.com/sunglasses/frames/ralph-ra5313u-green-l-30100",
    priceGhs: 270,
    brand: "Ralph Lauren",
    model: "RA5313U Green",
    reference: "RA5313U",
    gender: "WOMENS",
    category: "Designer",
    frameColor: "Green",
    shape: "Round",
    collection: "RALPH",
    bottleSize: 56,
    bridge: 17,
    temple: 145,
    bottleMaterial: "ACRYLIC",
    bottleDetail:
      "Green acetate round · Full rim · 56-17-145 · Branded case",
    liquidColor: "Brown gradient · Premium sun lenses",
    longevity: "100% UVA/UVB protection",
    imageKey: "lusmt03100",
    descriptionLead:
      "Fresh green acetate in a rounded full-rim profile — a colour-forward pair with timeless appeal.",
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

async function resolveSourceImages(imageKey: string): Promise<string[]> {
  return discoverSequentialImageUrls(
    (index) => EBD_CDN(imageKey, index),
    8
  );
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
    select: { id: true, name: true },
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
    const images = await resolveSourceImages(config.imageKey);
    console.log(`\n── ${config.brand} ${config.model} (${config.key})`);
    console.log(`   Price: ${config.priceGhs} GHS · Category: ${config.category}`);
    console.log(`   Slug: ${slug}`);
    console.log(`   Images: ${images.length} angle(s)`);
    for (const url of images) {
      console.log(`     · ${url}`);
    }
    if (!images.length) {
      console.warn(`   ⚠ No images found — skipping ${config.key}`);
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
      const sourceImages = await resolveSourceImages(config.imageKey);
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

    console.log(`\nDone — ${imported} sunglasses imported.`);
  } finally {
    await disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
