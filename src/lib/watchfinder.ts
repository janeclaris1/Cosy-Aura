import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const WATCHFINDER_BASE_URL = "https://www.watchfinder.com";
const WATCHFINDER_UK_BASE_URL = "https://www.watchfinder.co.uk";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type WatchfinderLocale = "com" | "uk";

function baseUrlForLocale(locale: WatchfinderLocale = "com"): string {
  return locale === "uk" ? WATCHFINDER_UK_BASE_URL : WATCHFINDER_BASE_URL;
}

export interface WatchfinderOffer {
  sku: string;
  brand: string;
  series: string;
  reference: string;
  year: number;
  imageUrl: string;
  discountedPrice: number;
  originalPrice: number;
  discountPercent: number;
  stockType: string;
  hasBox: boolean;
  hasPapers: boolean;
  url: string;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function matchValue(chunk: string, pattern: RegExp): string | null {
  const match = chunk.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function matchNumber(chunk: string, pattern: RegExp): number | null {
  const value = matchValue(chunk, pattern);
  return value ? Number(value) : null;
}

function toHighResImageUrl(imageUrl: string): string {
  const url = new URL(imageUrl);
  url.searchParams.set("quality", "85");
  url.searchParams.set("bg-color", "255,255,255");
  url.searchParams.set("height", "720");
  url.searchParams.set("width", "560");
  url.searchParams.set("fit", "crop");
  return url.toString();
}

function parseProductCard(chunk: string, baseUrl: string): WatchfinderOffer | null {
  const reference = matchValue(chunk, /data-product-model="([^"]+)"/);
  const encodedImage = matchValue(chunk, /data-product-image="([^"]+)"/);
  const series = matchValue(chunk, /data-product-series="([^"]+)"/);
  const sku = matchValue(chunk, /data-product-sku="([^"]+)"/);
  const brand = matchValue(chunk, /data-product-brand="([^"]+)"/);
  const href = matchValue(chunk, /href="(\/[^"]+)"/);
  const year = matchNumber(
    chunk,
    /product-card__specs__year-location__item__value">\s*(\d{4})\s*</
  );
  const finalPrice = matchNumber(
    chunk,
    /data-price-type="finalPrice"[\s\S]*?data-price-amount="(\d+)"/
  );
  const oldPrice = matchNumber(
    chunk,
    /data-price-type="oldPrice"[\s\S]*?data-price-amount="(\d+)"/
  );
  const discountPercent = matchNumber(chunk, /product-card__usp-badges__item">-(\d+)%</);
  const stockType =
    matchValue(chunk, /<div class="product-card__usp">\s*([^<]+?)\s*<\/div>/) ?? "STANDARD";
  const hasBox = true;
  const hasPapers = true;

  if (!reference || !encodedImage || !year || !finalPrice || !oldPrice || !sku) {
    return null;
  }

  return {
    sku,
    brand: decodeHtmlEntities(brand ?? ""),
    series: decodeHtmlEntities(series ?? ""),
    reference,
    year,
    imageUrl: toHighResImageUrl(decodeHtmlEntities(encodedImage)),
    discountedPrice: finalPrice,
    originalPrice: oldPrice,
    discountPercent: discountPercent ?? Math.round((1 - finalPrice / oldPrice) * 100),
    stockType: decodeHtmlEntities(stockType.trim()),
    hasBox,
    hasPapers,
    url: href?.startsWith("http") ? href : `${baseUrl}${href ?? ""}`,
  };
}

export function parseWatchfinderOffers(
  html: string,
  locale: WatchfinderLocale = "com"
): WatchfinderOffer[] {
  const baseUrl = baseUrlForLocale(locale);
  const chunks = html.split('class="product-card"').slice(1);
  return chunks
    .map((chunk) => parseProductCard(chunk, baseUrl))
    .filter((offer): offer is WatchfinderOffer => offer !== null);
}

export async function fetchWatchfinderOffers(
  brandSlug = "rolex",
  options: { locale?: WatchfinderLocale; brandName?: string } = {}
): Promise<WatchfinderOffer[]> {
  const locale = options.locale ?? "com";
  const baseUrl = baseUrlForLocale(locale);
  const brandName =
    options.brandName ??
    brandSlug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  const url = `${baseUrl}/special-offers?filter-brand=${encodeURIComponent(brandName)}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Watchfinder offers: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return parseWatchfinderOffers(html, locale);
}

export function getLocalWatchImagePath(brandSlug: string, sku: string): string {
  return `/images/watches/${brandSlug}/${sku}.jpg`;
}

export async function downloadWatchfinderImage(
  brandSlug: string,
  sku: string,
  imageUrl: string
): Promise<string> {
  const outputDir = path.join(process.cwd(), "public/images/watches", brandSlug);
  await mkdir(outputDir, { recursive: true });

  const response = await fetch(imageUrl, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to download Watchfinder image for ${brandSlug}/${sku}: ${response.status}`
    );
  }

  const outputPath = path.join(outputDir, `${sku}.jpg`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);

  return getLocalWatchImagePath(brandSlug, sku);
}

export async function resolveWatchfinderImage(
  brandSlug: string,
  offer: WatchfinderOffer
): Promise<string> {
  return downloadWatchfinderImage(brandSlug, offer.sku, offer.imageUrl);
}
