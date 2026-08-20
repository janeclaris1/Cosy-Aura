import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://www.watchesofswitzerland.com";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface WosCollectionConfig {
  handle: string;
  imageDir: string;
  defaultBrand: string;
  maxImages?: number;
}

export const WOS_COLLECTIONS = {
  "cartier-new-arrivals": {
    handle: "cartier-new-arrivals",
    imageDir: "watchesofswitzerland/cartier",
    defaultBrand: "Cartier",
  },
  tissot: {
    handle: "tissot",
    imageDir: "watchesofswitzerland/tissot",
    defaultBrand: "Tissot",
    maxImages: 3,
  },
  timex: {
    handle: "timex",
    imageDir: "watchesofswitzerland/timex",
    defaultBrand: "Timex",
    maxImages: 3,
  },
  "vacheron-constantin": {
    handle: "vacheron-constantin",
    imageDir: "watchesofswitzerland/vacheron-constantin",
    defaultBrand: "Vacheron Constantin",
    maxImages: 3,
  },
} as const satisfies Record<string, WosCollectionConfig>;

export type WosCollectionKey = keyof typeof WOS_COLLECTIONS;

export interface WosProduct {
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
  category: string;
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

function parseSeries(title: string, brand: string): string {
  const head = title.split("|")[0].toLowerCase();
  const brandLower = brand.toLowerCase();

  if (brandLower.includes("tissot")) {
    if (head.includes("prx")) return "PRX";
    if (head.includes("seastar") || head.includes("sea star")) return "Seastar";
    if (head.includes("gentleman")) return "Gentleman";
    if (head.includes("ballade")) return "Ballade";
    if (head.includes("chrono xl")) return "Chrono XL";
    if (head.includes("classic dream")) return "Classic Dream";
    if (head.includes("carson")) return "Carson";
    if (head.includes("le locle")) return "Le Locle";
    if (head.includes("t-race") || head.includes("t race")) return "T-Race";
    if (head.includes("prc 100") || head.includes("prc100") || head.includes("prc solar")) {
      return "PRC 100";
    }
    if (head.includes("pr 100") || head.includes("pr100")) return "PR 100";
    if (head.includes("pr516") || head.includes("pr 516")) return "PR516";
    if (head.includes("supersport")) return "Supersport";
    if (head.includes("visodate")) return "Visodate";
    if (head.includes("everytime")) return "Everytime";
    if (head.includes("bellissima")) return "Bellissima";
    if (head.includes("t-touch") || head.includes("ttouch")) return "T-Touch";
    if (head.includes("srv")) return "SRV";
    if (head.includes("lovely")) return "Lovely";
    if (head.includes("flamingo")) return "Flamingo";
    if (head.includes("heritage")) return "Heritage";
    if (head.includes("couturier")) return "Couturier";
    if (head.includes("chemin des tourelles")) return "Chemin des Tourelles";
    return (
      title
        .split("|")[0]
        .trim()
        .replace(/^Tissot\s+/i, "")
        .replace(/\s+\d+mm.*$/i, "")
        .trim() || "Tissot"
    );
  }

  if (brandLower.includes("timex")) {
    if (head.includes("deepwater")) return "Deepwater";
    if (head.includes("waterbury")) return "Waterbury";
    if (head.includes("marlin")) return "Marlin";
    if (head.includes("expedition")) return "Expedition";
    if (head.includes("weekender")) return "Weekender";
    if (head.includes("q timex") || /^q[\s®]/.test(head) || /\bq\b/.test(head)) {
      return "Q Timex";
    }
    if (head.includes("atelier")) return "Atelier";
    if (head.includes("ironman")) return "Ironman";
    if (head.includes("easy reader")) return "Easy Reader";
    if (head.includes("cavatina")) return "Cavatina";
    if (head.includes("teeny tiny")) return "Teeny Tiny";
    if (head.includes("automatic 1983") || head.includes("1983 e")) {
      return "Automatic 1983";
    }
    if (head.includes("jacquie aiche")) return "Jacquie Aiche";
    if (head.includes("pan am")) return "Pan Am";
    if (head.includes("peanuts")) return "Marlin";
    return (
      title
        .split("|")[0]
        .trim()
        .replace(/^Timex\s+/i, "")
        .replace(/®/g, "")
        .replace(/\s+\d+mm.*$/i, "")
        .trim() || "Timex"
    );
  }

  if (brandLower.includes("vacheron")) {
    if (head.includes("overseas")) return "Overseas";
    if (head.includes("patrimony")) return "Patrimony";
    if (head.includes("traditionnelle") || head.includes("traditionelle")) {
      return "Traditionnelle";
    }
    if (head.includes("historiques")) return "Historiques";
    if (head.includes("égérie") || head.includes("egerie") || head.includes("egeríe")) {
      return "Égérie";
    }
    if (head.includes("fiftysix") || head.includes("fifty-six") || head.includes("fifty six")) {
      return "Fiftysix";
    }
    if (head.includes("harmony")) return "Harmony";
    if (head.includes("malte")) return "Malte";
    if (head.includes("métiers") || head.includes("metiers")) return "Métiers d'Art";
    return (
      title
        .split("|")[0]
        .trim()
        .replace(/^Vacheron Constantin\s+/i, "")
        .replace(/\s+\d+mm.*$/i, "")
        .trim() || "Vacheron Constantin"
    );
  }

  if (head.includes("santos-dumont")) return "Santos-Dumont";
  if (head.includes("santos")) return "Santos";
  if (head.includes("tank must")) return "Tank Must";
  if (head.includes("tank louis")) return "Tank Louis Cartier";
  if (head.includes("tank française") || head.includes("tank francaise")) {
    return "Tank Française";
  }
  if (head.includes("tank américaine") || head.includes("tank americaine")) {
    return "Tank Américaine";
  }
  if (head.includes("tank")) return "Tank";
  if (head.includes("panthère") || head.includes("panthere")) return "Panthère";
  if (head.includes("ballon bleu")) return "Ballon Bleu";
  if (head.includes("baignoire")) return "Baignoire";
  if (head.includes("pasha")) return "Pasha";
  if (head.includes("roadster")) return "Roadster";
  if (head.includes("ronde")) return "Ronde";
  if (head.includes("clé de cartier") || head.includes("cle de cartier")) {
    return "Clé de Cartier";
  }
  if (head.includes("drive")) return "Drive";
  if (head.includes("tortue")) return "Tortue";
  if (head.includes("crash")) return "Crash";

  return title
    .split("|")[0]
    .trim()
    .replace(/\s+(Large|Small|Medium|Mini) Model.*/i, "")
    .trim();
}

function parseReference(title: string, handle: string, sku: string): string {
  const fromTitle = title.match(/Ref\.?\s*([A-Z0-9.]+)/i);
  if (fromTitle) return fromTitle[1].toUpperCase();

  const fromHandle = handle.match(/-(w[a-z0-9]{5,})-\d+$/i);
  if (fromHandle) return fromHandle[1].toUpperCase();

  // Tissot refs often look like T1374101109100
  const tissotRef = title.match(/\b(T\d{6,}[A-Z0-9]*)\b/i);
  if (tissotRef) return tissotRef[1].toUpperCase();

  const handleTissot = handle.match(/-(t\d{6,}[a-z0-9]*)/i);
  if (handleTissot) return handleTissot[1].toUpperCase();

  return sku.toUpperCase();
}

function parseCaseSize(title: string): string | null {
  const match = title.match(/(\d+(?:\.\d+)?)\s*mm/i);
  return match ? `${match[1]}mm` : null;
}

function parseCaseMaterial(title: string): WosProduct["caseMaterial"] {
  const text = title.toLowerCase();
  if (text.includes("carbon")) return "CERAMIC";
  if (text.includes("two-tone") || text.includes("two tone") || text.includes("steel &")) {
    return "TWO_TONE";
  }
  if (text.includes("platinum")) return "PLATINUM";
  if (
    text.includes("yellow gold") ||
    text.includes("rose gold") ||
    text.includes("white gold") ||
    text.includes("18k") ||
    text.includes("gold bezel")
  ) {
    return "GOLD";
  }
  if (text.includes("titanium")) return "TITANIUM";
  return "STEEL";
}

function parseStrapMaterial(title: string): WosProduct["strapMaterial"] {
  const text = title.toLowerCase();
  if (text.includes("leather") || text.includes("alligator")) return "LEATHER";
  if (text.includes("rubber")) return "RUBBER";
  if (text.includes("fabric") || text.includes("nato")) return "FABRIC";
  return "METAL";
}

function parseDial(title: string): string | null {
  const match = title.match(
    /(Silver|White|Ivory|Blue|Black|Champagne|Grey|Gray|Green|Pink|Roman|Orange|Ice Blue|Teal)(?:\s+Dial)?/i
  );
  return match?.[1] ?? null;
}

function parseGender(title: string, tags: string[]): WosProduct["gender"] {
  const text = `${title} ${tags.join(" ")}`.toLowerCase();
  if (
    text.includes("women") ||
    text.includes("ladies") ||
    text.includes("mini model") ||
    text.includes("bellissima") ||
    text.includes("lovely") ||
    text.includes("égérie") ||
    text.includes("egerie")
  ) {
    return "WOMENS";
  }
  if (text.includes("men's") || text.includes("mens") || text.includes("men’s")) {
    return "MENS";
  }
  if (
    text.includes("small model") &&
    (text.includes("panthère") || text.includes("tank") || text.includes("baignoire"))
  ) {
    return "WOMENS";
  }
  return "UNISEX";
}

function parseCategory(series: string, tags: string[], title: string): string {
  const text = `${series} ${tags.join(" ")} ${title}`.toLowerCase();
  if (
    text.includes("seastar") ||
    text.includes("dive") ||
    text.includes("deepwater") ||
    text.includes("200m") ||
    text.includes("2000") ||
    text.includes("1000")
  ) {
    return "Dive Watches";
  }
  if (
    text.includes("sport") ||
    text.includes("prx") ||
    text.includes("t-race") ||
    text.includes("supersport") ||
    text.includes("chrono") ||
    text.includes("pr516") ||
    text.includes("prc") ||
    text.includes("pr 100") ||
    text.includes("santos") ||
    text.includes("expedition") ||
    text.includes("ironman") ||
    text.includes("q timex") ||
    text.includes("waterbury") ||
    text.includes("overseas")
  ) {
    return "Sport Watches";
  }
  return "Dress Watches";
}

function parseMovement(title: string, tags: string[]): WosProduct["movement"] {
  const text = `${title} ${tags.join(" ")}`.toLowerCase();
  if (text.includes("manual-winding") || text.includes("manual winding") || text.includes("manual-w")) {
    return "MANUAL";
  }
  if (text.includes("powermatic") || text.includes("automatic") || text.includes("self-winding") || text.includes("self winding")) {
    return "AUTOMATIC";
  }
  if (text.includes("quartz") || text.includes("solarbeat") || text.includes("solar")) {
    return "QUARTZ";
  }
  if (text.includes("manual")) return "MANUAL";
  // Most Tissot chronographs / classics without Powermatic are quartz
  if (text.includes("tissot") && (text.includes("chrono") || text.includes("classic dream"))) {
    return "QUARTZ";
  }
  // Timex defaults to quartz unless automatic is stated
  if (text.includes("timex")) return "QUARTZ";
  return "AUTOMATIC";
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

export function mapWosProduct(
  product: ShopifyProduct,
  config: WosCollectionConfig
): WosProduct | null {
  const variant = product.variants[0];
  const maxImages = config.maxImages ?? product.images?.length ?? 0;
  const images = (product.images ?? [])
    .slice(0, maxImages || undefined)
    .map((img) => highResShopifyImage(img.src));
  if (!variant || images.length === 0) return null;

  const tags = product.tags ?? [];
  const sku = variant.sku?.trim() || String(product.id);
  const brand = product.vendor || config.defaultBrand;
  const series = parseSeries(product.title, brand);

  return {
    id: String(product.id),
    sku,
    handle: product.handle,
    title: product.title,
    brand,
    series,
    reference: parseReference(product.title, product.handle, sku),
    year: null,
    price: Math.round(Number(variant.price)),
    description: stripHtml(product.body_html || product.title),
    imageUrls: images,
    caseSize: parseCaseSize(product.title),
    hasBox: true,
    hasPapers: true,
    movement: parseMovement(product.title, tags),
    caseMaterial: parseCaseMaterial(product.title),
    strapMaterial: parseStrapMaterial(product.title),
    dial: parseDial(product.title),
    gender: parseGender(product.title, tags),
    category: parseCategory(series, tags, product.title),
    available: Boolean(variant.available),
    url: `${BASE_URL}/products/${product.handle}`,
    imageDir: config.imageDir,
  };
}

export async function fetchWosCollection(
  collectionKey: WosCollectionKey
): Promise<WosProduct[]> {
  const config = WOS_COLLECTIONS[collectionKey];
  const all: WosProduct[] = [];
  let page = 1;

  while (page <= 10) {
    const url = `${BASE_URL}/collections/${config.handle}/products.json?limit=250&page=${page}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Watches of Switzerland ${config.handle}: ${response.status}`
      );
    }

    const data = (await response.json()) as { products: ShopifyProduct[] };
    const batch = (data.products ?? [])
      .map((product) => mapWosProduct(product, config))
      .filter((product): product is WosProduct => product !== null);

    all.push(...batch);
    if ((data.products ?? []).length < 250) break;
    page += 1;
  }

  return all;
}

export async function downloadWosImages(product: WosProduct): Promise<string[]> {
  const safeSku = product.sku.replace(/[^\w.-]/g, "_");
  const outputDir = path.join(
    process.cwd(),
    "public/images/watches",
    product.imageDir,
    safeSku
  );
  await mkdir(outputDir, { recursive: true });

  const localPaths: string[] = [];

  for (let index = 0; index < product.imageUrls.length; index += 1) {
    const imageUrl = product.imageUrls[index];
    const response = await fetch(imageUrl, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!response.ok) {
      console.warn(`Skipping image ${index + 1} for ${product.sku}: ${response.status}`);
      continue;
    }

    const filename = `${index + 1}.jpg`;
    const outputPath = path.join(outputDir, filename);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 1000) continue;
    await writeFile(outputPath, buffer);
    localPaths.push(`/images/watches/${product.imageDir}/${safeSku}/${filename}`);
  }

  if (localPaths.length === 0) {
    throw new Error(`No images downloaded for ${product.sku}`);
  }

  return localPaths;
}
