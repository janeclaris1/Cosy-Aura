import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://wristaficionado.com";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface WristCollectionConfig {
  handle: string;
  series: string;
  imageDir: string;
  defaultBrand: string;
}

export const WRIST_COLLECTIONS = {
  daytona: {
    handle: "rolex-daytona",
    series: "Daytona",
    imageDir: "wristaficionado",
    defaultBrand: "Rolex",
  },
  nautilus: {
    handle: "patek-philippe-nautilus",
    series: "Nautilus",
    imageDir: "wristaficionado/nautilus",
    defaultBrand: "Patek Philippe",
  },
  aquanaut: {
    handle: "patek-philippe-aquanaut",
    series: "Aquanaut",
    imageDir: "wristaficionado/aquanaut",
    defaultBrand: "Patek Philippe",
  },
} as const satisfies Record<string, WristCollectionConfig>;

export type WristCollectionKey = keyof typeof WRIST_COLLECTIONS;

export interface WristAficionadoProduct {
  id: string;
  sku: string;
  handle: string;
  title: string;
  brand: string;
  series: string;
  reference: string;
  year: number | null;
  price: number;
  compareAtPrice: number | null;
  description: string;
  imageUrl: string;
  caseSize: string | null;
  hasBox: boolean;
  hasPapers: boolean;
  movement: "AUTOMATIC" | "MANUAL" | "QUARTZ";
  caseMaterial: "STEEL" | "GOLD" | "PLATINUM" | "TWO_TONE" | "TITANIUM" | "CERAMIC";
  strapMaterial: "METAL" | "LEATHER" | "RUBBER" | "FABRIC";
  dial: string | null;
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
    compare_at_price: string | null;
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

function parseReference(title: string, series: string): string {
  const seriesKey = series.toLowerCase();

  if (seriesKey === "aquanaut") {
    const aquanaut = title.match(
      /Aquanaut(?:\s+Luce)?\s+([0-9][0-9A-Za-z]*(?:\/[0-9A-Za-z.-]+)?(?:-[0-9A-Za-z]+)?)/i
    );
    if (aquanaut) return aquanaut[1].toUpperCase();
  }

  if (seriesKey === "nautilus") {
    const nautilus = title.match(
      /Nautilus\s+([0-9][0-9A-Za-z]*(?:\/[0-9A-Za-z.-]+)?(?:-[0-9A-Za-z]+)?)/i
    );
    if (nautilus) return nautilus[1].toUpperCase();
  }

  if (seriesKey === "daytona") {
    const numericRef = title.match(/\b(\d{4,6}[A-Z]{0,6})\b/i);
    if (numericRef) return numericRef[1].toUpperCase();
  }

  const generic = title.match(/\b(\d{4,6}(?:\/[\w.-]+)?(?:-[\w]+)?)\b/i);
  return generic?.[1]?.toUpperCase() ?? "UNKNOWN";
}

function parseYear(title: string, tags: string[]): number | null {
  const fromTitle = title.match(/\((\d{4})\)/);
  if (fromTitle) return Number(fromTitle[1]);

  for (const tag of tags) {
    if (/^\d{4}$/.test(tag)) return Number(tag);
  }

  return null;
}

function parseCaseSize(tags: string[], series: string): string | null {
  for (const tag of tags) {
    const match = tag.match(/(\d+(?:\.\d+)?)\s*-?\s*mm/i);
    if (match) return `${match[1]}mm`;
  }
  if (series.toLowerCase() === "aquanaut") return "40mm";
  if (series.toLowerCase() === "nautilus") return "40mm";
  return "40mm";
}

function parseCaseMaterial(title: string): WristAficionadoProduct["caseMaterial"] {
  const text = title.toLowerCase();
  if (text.includes("platinum")) return "PLATINUM";
  if (text.includes("two-tone") || text.includes("rolesor")) return "TWO_TONE";
  if (
    text.includes("yellow gold") ||
    text.includes("rose gold") ||
    text.includes("everose") ||
    text.includes("white gold") ||
    text.includes("gold")
  ) {
    return "GOLD";
  }
  return "STEEL";
}

function parseStrapMaterial(title: string, tags: string[], series?: string): WristAficionadoProduct["strapMaterial"] {
  const text = `${title} ${tags.join(" ")} ${series ?? ""}`.toLowerCase();
  if (text.includes("oysterflex") || text.includes("rubber") || text.includes("aquanaut")) {
    return "RUBBER";
  }
  if (text.includes("leather")) return "LEATHER";
  return "METAL";
}

function parseMovement(tags: string[]): WristAficionadoProduct["movement"] {
  if (tags.some((tag) => /manual/i.test(tag))) return "MANUAL";
  if (tags.some((tag) => /quartz/i.test(tag))) return "QUARTZ";
  return "AUTOMATIC";
}

function parseDial(title: string): string | null {
  const match = title.match(
    /(Black|White|Green|Blue|Champagne|Meteorite|Chocolate|Ice Blue|Panda|Reverse Panda|Mother of Pearl|Pave Diamond|Silver|Blue-Gray)(?:\s+Dial)?/i
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

export function mapShopifyProduct(
  product: ShopifyProduct,
  config: WristCollectionConfig
): WristAficionadoProduct | null {
  const variant = product.variants[0];
  const image = product.images[0]?.src;
  if (!variant || !image) return null;

  const tags = product.tags ?? [];
  const sku = variant.sku?.trim() || String(product.id);
  const price = Math.round(Number(variant.price));
  const compareAt = variant.compare_at_price
    ? Math.round(Number(variant.compare_at_price))
    : null;

  return {
    id: String(product.id),
    sku,
    handle: product.handle,
    title: product.title,
    brand: product.vendor || config.defaultBrand,
    series: config.series,
    reference: parseReference(product.title, config.series),
    year: parseYear(product.title, tags),
    price,
    compareAtPrice: compareAt,
    description: stripHtml(product.body_html || product.title),
    imageUrl: highResShopifyImage(image),
    caseSize: parseCaseSize(tags, config.series),
    hasBox: true,
    hasPapers: true,
    movement: parseMovement(tags),
    caseMaterial: parseCaseMaterial(product.title),
    strapMaterial: parseStrapMaterial(product.title, tags, config.series),
    dial: parseDial(product.title),
    available: Boolean(variant.available),
    url: `${BASE_URL}/products/${product.handle}`,
    imageDir: config.imageDir,
  };
}

export async function fetchWristAficionadoCollection(
  collectionKey: WristCollectionKey
): Promise<WristAficionadoProduct[]> {
  const config = WRIST_COLLECTIONS[collectionKey];
  const url = `${BASE_URL}/collections/${config.handle}/products.json?limit=250`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Wrist Aficionado ${config.series}: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as { products: ShopifyProduct[] };
  return (data.products ?? [])
    .map((product) => mapShopifyProduct(product, config))
    .filter((product): product is WristAficionadoProduct => product !== null);
}

/** @deprecated Use fetchWristAficionadoCollection("daytona") */
export async function fetchWristAficionadoDaytonas(): Promise<WristAficionadoProduct[]> {
  return fetchWristAficionadoCollection("daytona");
}

export function getLocalWristImagePath(imageDir: string, sku: string): string {
  const safeSku = sku.replace(/[^\w.-]/g, "_");
  return `/images/watches/${imageDir}/${safeSku}.jpg`;
}

export async function downloadWristAficionadoImage(
  product: Pick<WristAficionadoProduct, "sku" | "imageUrl" | "imageDir">
): Promise<string> {
  const outputDir = path.join(process.cwd(), "public/images/watches", product.imageDir);
  await mkdir(outputDir, { recursive: true });

  const response = await fetch(product.imageUrl, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Failed to download image for ${product.sku}: ${response.status}`);
  }

  const safeSku = product.sku.replace(/[^\w.-]/g, "_");
  const outputPath = path.join(outputDir, `${safeSku}.jpg`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);

  return getLocalWristImagePath(product.imageDir, product.sku);
}

export async function resolveWristAficionadoImage(
  product: WristAficionadoProduct
): Promise<string> {
  return downloadWristAficionadoImage(product);
}
