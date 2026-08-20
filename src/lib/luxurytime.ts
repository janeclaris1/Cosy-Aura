import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://www.luxurytime.co.za";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface LuxurytimeCollectionConfig {
  handle: string;
  imageDir: string;
  defaultBrand: string;
}

export const LUXURYTIME_COLLECTIONS = {
  hublot: {
    handle: "hublot",
    imageDir: "luxurytime/hublot",
    defaultBrand: "Hublot",
  },
} as const satisfies Record<string, LuxurytimeCollectionConfig>;

export type LuxurytimeCollectionKey = keyof typeof LUXURYTIME_COLLECTIONS;

export interface LuxurytimeProduct {
  id: string;
  sku: string;
  handle: string;
  title: string;
  brand: string;
  series: string;
  reference: string;
  year: number | null;
  price: number;
  description: string;
  imageUrls: string[];
  caseSize: string | null;
  hasBox: boolean;
  hasPapers: boolean;
  movement: "AUTOMATIC" | "MANUAL" | "QUARTZ";
  caseMaterial: "STEEL" | "GOLD" | "PLATINUM" | "TWO_TONE" | "TITANIUM" | "CERAMIC";
  strapMaterial: "METAL" | "LEATHER" | "RUBBER" | "FABRIC";
  dial: string | null;
  gender: "MENS" | "WOMENS" | "UNISEX";
  available: boolean;
  url: string;
  imageDir: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  vendor: string;
  tags: string[];
  variants: Array<{
    id: number;
    sku: string | null;
    price: string;
    available: boolean;
  }>;
  images: Array<{ src: string }>;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSeries(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("classic fusion")) return "Classic Fusion";
  if (lower.includes("big bang")) return "Big Bang";
  if (lower.includes("spirit of big bang")) return "Spirit of Big Bang";
  return "Hublot";
}

function parseReference(title: string, tags: string[]): string {
  const fromTags = tags.find((tag) =>
    /^[0-9]{3}\.[A-Z0-9.]+$/i.test(tag.replace(/\s+/g, ""))
  );
  if (fromTags) return fromTags.replace(/\s+/g, "").replace(/\.$/, "").toUpperCase();

  const fromTitle = title.match(/\b(\d{3}\.[A-Z0-9.]+)\b/i);
  if (fromTitle) return fromTitle[1].replace(/\.$/, "").toUpperCase();

  return "UNKNOWN";
}

function parseYear(tags: string[], title: string): number | null {
  for (const tag of tags) {
    if (/^\d{4}$/.test(tag)) return Number(tag);
  }
  const fromTitle = title.match(/\((\d{4})\)/);
  return fromTitle ? Number(fromTitle[1]) : null;
}

function parseCaseSize(title: string, tags: string[]): string | null {
  const fromTitle = title.match(/(\d{2})\s*mm/i);
  if (fromTitle) return `${fromTitle[1]}mm`;
  for (const tag of tags) {
    const match = tag.match(/(\d{2})\s*mm/i);
    if (match) return `${match[1]}mm`;
  }
  return "42mm";
}

function parseCaseMaterial(title: string, tags: string[]): LuxurytimeProduct["caseMaterial"] {
  const text = `${title} ${tags.join(" ")}`.toLowerCase();
  if (text.includes("ceramic") || text.includes(".cm.") || text.includes(".cs.")) return "CERAMIC";
  if (text.includes("titanium") || text.includes(".nx.") || text.includes(".pt.")) return "TITANIUM";
  if (text.includes("gold") || text.includes(".yg.") || text.includes(".rg.")) return "GOLD";
  return "STEEL";
}

function parseStrapMaterial(title: string, tags: string[]): LuxurytimeProduct["strapMaterial"] {
  const text = `${title} ${tags.join(" ")}`.toLowerCase();
  if (text.includes("leather") || text.includes(".lr")) return "LEATHER";
  if (text.includes("rubber") || text.includes(".rx") || text.includes(".nr")) return "RUBBER";
  return "RUBBER";
}

function parseGender(title: string): LuxurytimeProduct["gender"] {
  const lower = title.toLowerCase();
  if (lower.includes("women") || lower.includes("ladies")) return "WOMENS";
  if (lower.includes("unisex")) return "UNISEX";
  return "MENS";
}

function parseDial(title: string): string | null {
  const match = title.match(
    /(Black|White|Blue|Green|Pink|Hot Pink|Skeleton|Silver|Grey|Gray)(?:\s+Dial)?/i
  );
  return match?.[1] ?? null;
}

function highResShopifyImage(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("width")) {
      parsed.searchParams.set("width", "1200");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function mapLuxurytimeProduct(
  product: ShopifyProduct,
  config: LuxurytimeCollectionConfig
): LuxurytimeProduct | null {
  const variant = product.variants[0];
  const images = (product.images ?? []).map((img) => highResShopifyImage(img.src));
  if (!variant || images.length === 0) return null;

  const tags = product.tags ?? [];
  const sku = variant.sku?.trim() || String(product.id);

  return {
    id: String(product.id),
    sku,
    handle: product.handle,
    title: product.title,
    brand: product.vendor || config.defaultBrand,
    series: parseSeries(product.title),
    reference: parseReference(product.title, tags),
    year: parseYear(tags, product.title),
    price: Math.round(Number(variant.price)),
    description: stripHtml(product.body_html || product.title),
    imageUrls: images,
    caseSize: parseCaseSize(product.title, tags),
    hasBox: true,
    hasPapers: true,
    movement: "AUTOMATIC",
    caseMaterial: parseCaseMaterial(product.title, tags),
    strapMaterial: parseStrapMaterial(product.title, tags),
    dial: parseDial(product.title),
    gender: parseGender(product.title),
    available: Boolean(variant.available),
    url: `${BASE_URL}/products/${product.handle}`,
    imageDir: config.imageDir,
  };
}

export async function fetchLuxurytimeCollection(
  collectionKey: LuxurytimeCollectionKey
): Promise<LuxurytimeProduct[]> {
  const config = LUXURYTIME_COLLECTIONS[collectionKey];
  const url = `${BASE_URL}/collections/${config.handle}/products.json?limit=250`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Luxurytime ${config.handle}: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as { products: ShopifyProduct[] };
  return (data.products ?? [])
    .map((product) => mapLuxurytimeProduct(product, config))
    .filter((product): product is LuxurytimeProduct => product !== null);
}

export async function downloadLuxurytimeImages(
  product: LuxurytimeProduct
): Promise<string[]> {
  const outputDir = path.join(process.cwd(), "public/images/watches", product.imageDir, product.sku);
  await mkdir(outputDir, { recursive: true });

  const localPaths: string[] = [];

  for (let index = 0; index < product.imageUrls.length; index += 1) {
    const imageUrl = product.imageUrls[index];
    const response = await fetch(imageUrl, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to download image ${index + 1} for ${product.sku}: ${response.status}`
      );
    }

    const filename = `${index + 1}.jpg`;
    const outputPath = path.join(outputDir, filename);
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(outputPath, buffer);
    localPaths.push(`/images/watches/${product.imageDir}/${product.sku}/${filename}`);
  }

  return localPaths;
}
