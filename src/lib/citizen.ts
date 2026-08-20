import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://www.citizenwatch.com";
const MENS_COLLECTION_PATH = "/us/en/collection/mens";
const WOMENS_COLLECTION_PATH = "/us/en/collection/womens";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const PAGE_SIZE = 48;
const MAX_IMAGES = 5;
const IMAGE_DIR = "citizen";

export interface CitizenProduct {
  id: string;
  sku: string;
  title: string;
  brand: string;
  series: string;
  reference: string;
  originalPrice: number;
  description: string;
  imageUrls: string[];
  caseSize: string | null;
  movement: "AUTOMATIC" | "MANUAL" | "QUARTZ";
  caseMaterial: "STEEL" | "GOLD" | "PLATINUM" | "TWO_TONE" | "TITANIUM" | "CERAMIC";
  strapMaterial: "METAL" | "LEATHER" | "RUBBER" | "FABRIC";
  dial: string | null;
  gender: "MENS" | "WOMENS" | "UNISEX";
  category: string;
  waterResistance: string | null;
  year: number | null;
  url: string;
  imageDir: string;
}

type CitizenHit = {
  price?: number;
  productId?: string;
  productName?: string;
  image?: { link?: string };
  imageGroups?: Array<{ images?: Array<{ link?: string }>; viewType?: string }>;
  representedProduct?: Record<string, unknown>;
  c_promotionalPrice?: number;
};

function extractHitsArray(html: string): CitizenHit[] {
  const start = html.indexOf('"hits":[');
  if (start < 0) return [];

  const i = html.indexOf("[", start);
  let depth = 0;
  let inStr = false;
  let esc = false;
  let end: number | null = null;

  for (let j = i; j < html.length; j += 1) {
    const ch = html[j];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        end = j + 1;
        break;
      }
    }
  }

  if (!end) return [];
  try {
    return JSON.parse(html.slice(i, end).replace(/\\u002F/g, "/")) as CitizenHit[];
  } catch {
    return [];
  }
}

function extractTotal(html: string): number {
  const match = html.match(/"total"\s*:\s*(\d+)/);
  return match ? Number(match[1]) : 0;
}

function widenJpegUrl(link: string, sku: string, index: number): string {
  const id = link.split("/content/")[1]?.split(/[/?#]/)[0];
  if (!id) return link;
  return `https://citizenwatch.widen.net/content/${id}/jpeg/${sku}-${index + 1}.jpg`;
}

function parseSeries(name: string, collection2?: string): string {
  const n = name.toLowerCase();
  if (n.includes("citizen l") || n.startsWith("l ")) return "Citizen L";
  if (n.includes("rainell")) return "Citizen L";
  if (n.includes("bianca")) return "Citizen L";
  if (n.includes("ceci")) return "Citizen L";
  if (n.includes("arcly")) return "Citizen L";
  if (n.includes("promaster")) return "Promaster";
  if (n.includes("tsuyosa")) return "TSUYOSA";
  if (n.includes("attesa")) return "ATTESA";
  if (n.includes("zenshin")) return "Zenshin";
  if (n.includes("tsuki-yomi") || n.includes("tsukiyomi")) return "Tsuki-Yomi";
  if (n.includes("series8") || n.includes("series 8")) return "Series 8";
  if (n.includes("pcat")) return "PCAT";
  if (n.includes("corso")) return "Corso";
  if (n.includes("fio")) return "Fio";
  if (n.includes("veya")) return "Veya";
  if (n.includes("peyten")) return "Peyten";
  if (n.includes("calendrier")) return "Calendrier";
  if (n.includes("silhouette")) return "Silhouette";
  if (n.includes("petite palidoro") || n.includes("palidoro")) return "Petite Palidoro";
  if (n.includes("axiom")) return "Axiom";
  if (n.includes("sport luxury")) return "Sport Luxury";
  if (n.includes("rolan")) return "Rolan";
  if (n.includes("the citizen")) return "The Citizen";
  if (n.includes("navihawk")) return "Promaster";
  if (n.includes("blue angels")) return "Blue Angels";
  if (collection2) {
    return (
      collection2
        .replace(/\s+(Eco|AUTO|Premier).*$/i, "")
        .replace(/\s*\/.*$/, "")
        .trim() || "Citizen"
    );
  }
  return name.split(/\s+/)[0] || "Citizen";
}

function parseCategory(series: string, name: string, water?: string | null): string {
  const s = `${series} ${name} ${water || ""}`.toLowerCase();
  if (s.includes("dive") || s.includes("promaster") || s.includes("200m") || s.includes("300m")) {
    return "Dive Watches";
  }
  if (s.includes("chrono") || s.includes("skyhawk") || s.includes("gmt")) {
    return "Sport Watches";
  }
  if (
    s.includes("citizen l") ||
    s.includes("corso") ||
    s.includes("rolan") ||
    s.includes("dress") ||
    s.includes("classic") ||
    s.includes("fio") ||
    s.includes("veya") ||
    s.includes("silhouette") ||
    s.includes("petite") ||
    s.includes("calendrier") ||
    s.includes("peyten") ||
    s.includes("axiom")
  ) {
    return "Dress Watches";
  }
  return "Sport Watches";
}

function parseMovement(tech?: string | null, desc?: string | null): CitizenProduct["movement"] {
  const t = `${tech || ""} ${desc || ""}`.toLowerCase();
  if (t.includes("automatic") || t.includes("mechanical")) return "AUTOMATIC";
  if (t.includes("manual")) return "MANUAL";
  return "QUARTZ"; // Eco-Drive / atomic / quartz
}

function parseCaseMaterial(raw?: string | null): CitizenProduct["caseMaterial"] {
  const t = (raw || "").toLowerCase();
  if (t.includes("titanium")) return "TITANIUM";
  if (t.includes("ceramic")) return "CERAMIC";
  if (t.includes("platinum")) return "PLATINUM";
  if (t.includes("gold") && t.includes("steel")) return "TWO_TONE";
  if (t.includes("gold")) return "GOLD";
  return "STEEL";
}

function parseStrap(raw?: string | null, bandType?: string | null): CitizenProduct["strapMaterial"] {
  const t = `${raw || ""} ${bandType || ""}`.toLowerCase();
  if (t.includes("rubber") || t.includes("polyurethane") || t.includes("urethane")) {
    return "RUBBER";
  }
  if (t.includes("leather")) return "LEATHER";
  if (t.includes("fabric") || t.includes("nylon") || t.includes("textile")) return "FABRIC";
  return "METAL";
}

function parseGender(raw?: string | null): CitizenProduct["gender"] {
  const t = (raw || "").toLowerCase();
  if (t.includes("women") || t.includes("lady")) return "WOMENS";
  if (t.includes("unisex")) return "UNISEX";
  return "MENS";
}

function parseYear(intro?: string | null): number | null {
  if (!intro) return null;
  const m = String(intro).match(/(20\d{2}|19\d{2})/);
  return m ? Number(m[1]) : null;
}

function mapHit(
  hit: CitizenHit,
  genderOverride?: CitizenProduct["gender"]
): CitizenProduct | null {
  const rp = (hit.representedProduct || {}) as Record<string, unknown>;
  const sku = String(hit.productId || rp.id || "").trim();
  const title = String(hit.productName || "").trim();
  const originalPrice = Number(hit.price);
  if (!sku || !title || !Number.isFinite(originalPrice) || originalPrice <= 0) {
    return null;
  }

  const collection2 = String(rp.c_PDCollection2 || "");
  const series = parseSeries(title, collection2);
  const water = String(rp.c_waterResistance || rp.c_waterResistanceBulova || "") || null;
  const caseWidth = rp.c_caseWidth ? `${rp.c_caseWidth}mm` : null;

  const imageLinks: string[] = [];
  const largeGroup = (hit.imageGroups || []).find((g) => g.viewType === "large");
  for (const img of largeGroup?.images || []) {
    if (img.link) imageLinks.push(img.link);
  }
  if (imageLinks.length === 0 && hit.image?.link) imageLinks.push(hit.image.link);

  // Prefer alternate asset IDs when imageGroups is thin
  for (const key of [
    "c_mainImageURL",
    "c_backImageURL",
    "c_alternateImage1URL",
    "c_alternateImage2URL",
    "c_alternateImage3URL",
    "c_alternateImage4URL",
  ]) {
    const id = rp[key];
    if (typeof id === "string" && id && !imageLinks.some((l) => l.includes(id))) {
      imageLinks.push(`https://citizenwatch.widen.net/content/${id}`);
    }
  }

  const uniqueLinks: string[] = [];
  const seenLinks = new Set<string>();
  for (const link of imageLinks) {
    if (seenLinks.has(link)) continue;
    seenLinks.add(link);
    uniqueLinks.push(link);
    if (uniqueLinks.length >= MAX_IMAGES) break;
  }
  if (uniqueLinks.length === 0) return null;

  // Skip strap / accessory SKUs that appear in collections
  const titleLower = title.toLowerCase();
  if (
    titleLower.includes("strap") ||
    titleLower.includes("bracelet") ||
    /^59-/.test(sku) ||
    collection2.toLowerCase().includes("anc")
  ) {
    return null;
  }

  const movementTech = String(rp.c_movementTechnology || "");
  const movementDesc = String(rp.c_movementDescription || "");
  const dial = String(rp.c_dialColor || "").split(",")[0]?.trim() || null;
  const intro = String(rp.c_modelIntroDate || rp.c_introDate || "");

  const descriptionParts = [
    title,
    movementTech ? `${movementTech} movement.` : null,
    water ? `Water resistance: ${water}.` : null,
    caseWidth ? `Case size: ${caseWidth}.` : null,
    String(rp.c_caseMaterial || "")
      ? `Case: ${rp.c_caseMaterial}.`
      : null,
    String(rp.c_bandMaterial || "")
      ? `Band: ${rp.c_bandMaterial}.`
      : null,
  ].filter(Boolean);

  return {
    id: sku,
    sku,
    title,
    brand: "Citizen",
    series,
    reference: sku,
    originalPrice,
    description: descriptionParts.join(" "),
    imageUrls: uniqueLinks.map((link, index) => widenJpegUrl(link, sku, index)),
    caseSize: caseWidth,
    movement: parseMovement(movementTech, movementDesc),
    caseMaterial: parseCaseMaterial(String(rp.c_caseMaterial || "")),
    strapMaterial: parseStrap(
      String(rp.c_bandMaterial || ""),
      String(rp.c_bandType || "")
    ),
    dial,
    gender: genderOverride || parseGender(String(rp.c_gender || "Men")),
    category: parseCategory(series, title, water),
    waterResistance: water,
    year: parseYear(intro),
    url: `${BASE_URL}/us/en/product/${encodeURIComponent(sku)}`,
    imageDir: IMAGE_DIR,
  };
}

async function fetchCitizenCollection(
  collectionPath: string,
  label: string,
  genderOverride?: CitizenProduct["gender"]
): Promise<CitizenProduct[]> {
  const all: CitizenProduct[] = [];
  const seen = new Set<string>();
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const url = `${BASE_URL}${collectionPath}?offset=${offset}&limit=${PAGE_SIZE}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Citizen ${label} page at offset ${offset}: ${response.status}`
      );
    }

    const html = await response.text();
    if (total === Infinity) {
      total = extractTotal(html) || 0;
      if (!total) break;
    }

    const hits = extractHitsArray(html);
    if (hits.length === 0) break;

    let added = 0;
    for (const hit of hits) {
      const product = mapHit(hit, genderOverride);
      if (!product || seen.has(product.sku)) continue;
      seen.add(product.sku);
      all.push(product);
      added += 1;
    }

    console.log(
      `  Citizen ${label} offset=${offset}: +${added} (total ${all.length}/${total})`
    );

    offset += PAGE_SIZE;
    if (added === 0) break;
  }

  return all;
}

export async function fetchCitizenMensCollection(): Promise<CitizenProduct[]> {
  return fetchCitizenCollection(MENS_COLLECTION_PATH, "mens", "MENS");
}

export async function fetchCitizenWomensCollection(): Promise<CitizenProduct[]> {
  return fetchCitizenCollection(WOMENS_COLLECTION_PATH, "womens", "WOMENS");
}

export async function downloadCitizenImages(
  product: CitizenProduct
): Promise<string[]> {
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
