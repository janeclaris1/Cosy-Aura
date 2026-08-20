import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const MAYORS_JACOB_LISTING =
  "https://www.mayors.com/c/Brands/Jacob-and.-Co?q=fh_view_size%3D48%26fh_view%3Dsearch%26wosg_site%3Dmayors_us%26fh_refpath%3Da7fe9487-ef5a-4d75-b5bf-1869c96ce150%26fh_refview%3Dlister%26fh_reffacet%3Dmovement%26fh_location%3D%252f%252fcatalog01%252fen_US%252fcategories%253c%257bcatalog01_brands%257d%252fcategories%253c%257bcatalog01_brands_jacobandco%257d%252frecipient%253e%257bforhim%257d%252fmovement%253e%257bmanualwinding%257d";

export interface MayorsProduct {
  id: string;
  sku: string;
  title: string;
  brand: string;
  series: string;
  reference: string;
  description: string;
  imageUrls: string[];
  caseSize: string | null;
  movement: "AUTOMATIC" | "MANUAL" | "QUARTZ";
  caseMaterial: "STEEL" | "GOLD" | "PLATINUM" | "TWO_TONE" | "TITANIUM" | "CERAMIC";
  strapMaterial: "METAL" | "LEATHER" | "RUBBER" | "FABRIC";
  dial: string | null;
  gender: "MENS" | "WOMENS" | "UNISEX";
  category: string;
  url: string;
}

function parseSeries(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("astronomia")) return "Astronomia";
  if (t.includes("twin turbo")) return "Twin Turbo";
  if (t.includes("bugatti")) return "Bugatti";
  if (t.includes("fleurs de jardin") || t.includes("fleur de jardin")) {
    return "Fleurs de Jardin";
  }
  if (t.includes("brilliant skeleton")) return "Brilliant Skeleton";
  if (t.includes("brilliant")) return "Brilliant";
  if (t.includes("epic sf24") || t.includes("epic-sf24")) return "Epic SF24";
  if (t.includes("epic x chrono") || t.includes("epix x chrono")) return "Epic X Chrono";
  if (t.includes("epic x") || t.includes("epix x")) return "Epic X";
  return "Jacob & Co";
}

function inferCategory(series: string): string {
  const s = series.toLowerCase();
  if (
    s.includes("epic") ||
    s.includes("twin turbo") ||
    s.includes("bugatti")
  ) {
    return "Sport Watches";
  }
  if (s.includes("astronomia") || s.includes("jardin") || s.includes("brilliant")) {
    return "Dress Watches";
  }
  return "Sport Watches";
}

function parseCaseMaterial(title: string): MayorsProduct["caseMaterial"] {
  const t = title.toLowerCase();
  if (t.includes("platinum")) return "PLATINUM";
  if (t.includes("titanium")) return "TITANIUM";
  if (t.includes("ceramic") || t.includes("dlc")) return "CERAMIC";
  if (t.includes("rose gold") || t.includes("white gold") || t.includes("gold")) {
    return "GOLD";
  }
  if (t.includes("steel") && t.includes("gold")) return "TWO_TONE";
  if (t.includes("steel")) return "STEEL";
  return "TITANIUM";
}

function parseStrap(title: string): MayorsProduct["strapMaterial"] {
  const t = title.toLowerCase();
  if (t.includes("rubber")) return "RUBBER";
  if (t.includes("fabric") || t.includes("textile")) return "FABRIC";
  if (t.includes("bracelet") || t.includes("steel")) return "METAL";
  return "RUBBER";
}

function parseMovement(title: string, series: string): MayorsProduct["movement"] {
  const t = `${title} ${series}`.toLowerCase();
  if (t.includes("quartz")) return "QUARTZ";
  // Astronomia / tourbillon pieces are typically manual-wind high complications
  if (t.includes("astronomia") || t.includes("tourbillon") || t.includes("manual")) {
    return "MANUAL";
  }
  return "AUTOMATIC";
}

function parseCaseSize(title: string): string | null {
  const match = title.match(/(\d{2})\s*mm/i);
  if (match) return `${match[1]}mm`;
  const series = parseSeries(title).toLowerCase();
  if (series.includes("brilliant")) return "38mm";
  if (series.includes("astronomia")) return "47mm";
  if (series.includes("bugatti") || series.includes("twin turbo")) return "45mm";
  return "44mm";
}

function parseDial(title: string): string | null {
  const t = title.toLowerCase();
  if (t.includes("skeleton")) return "Skeleton";
  if (t.includes("green")) return "Green";
  if (t.includes("red")) return "Red";
  if (t.includes("blue")) return "Blue";
  if (t.includes("white")) return "White";
  if (t.includes("black")) return "Black";
  if (t.includes("purple")) return "Purple";
  return "Skeleton";
}

function decodeTitleFromPath(pathName: string): { title: string; reference: string } {
  const decoded = decodeURIComponent(pathName);
  const withoutBrand = decoded.replace(/^Jacob-and\.-Co-/, "");
  const refMatch = withoutBrand.match(
    /-([A-Z]{2}\d{2,4}(?:[.\-][A-Z0-9+]+)*)\/?$/i
  );
  let reference = refMatch?.[1]?.replace(/\+/g, ".") || "";
  let titlePart = withoutBrand;
  if (refMatch) {
    titlePart = withoutBrand.slice(0, refMatch.index);
  }
  const title = titlePart
    .replace(/-/g, " ")
    .replace(/\+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!reference) {
    const fallback = withoutBrand.match(/([A-Z]{2}\d{2,4}(?:\.[A-Z0-9]+)+)/i);
    reference = fallback?.[1] || withoutBrand.slice(0, 24);
  }
  return { title, reference: reference.toUpperCase() };
}

export async function fetchMayorsJacobCoProducts(): Promise<MayorsProduct[]> {
  const res = await fetch(MAYORS_JACOB_LISTING, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
  });
  if (!res.ok) {
    throw new Error(`Mayors listing failed: ${res.status}`);
  }
  const html = await res.text();
  const products: MayorsProduct[] = [];
  const seen = new Set<string>();
  const hrefRe = /href="(\/Jacob-and\.-Co-[^"]+\/p\/(\d+))"/g;
  let match: RegExpExecArray | null;

  while ((match = hrefRe.exec(html))) {
    const productPath = match[1];
    const id = match[2];
    if (seen.has(id)) continue;
    seen.add(id);

    const slugPart = productPath.split("/p/")[0].replace(/^\//, "");
    const { title, reference } = decodeTitleFromPath(slugPart);
    const series = parseSeries(title);
    const imageUrls = [
      `https://content.thewosgroup.com/productimage/${id}/${id}_1.jpg`,
      `https://content.thewosgroup.com/productimage/${id}/${id}_2.jpg`,
    ];

    products.push({
      id,
      sku: id,
      title,
      brand: "Jacob & Co",
      series,
      reference,
      description: `${title} by Jacob & Co. Reference ${reference}. Sourced from authorized luxury retail catalog.`,
      imageUrls,
      caseSize: parseCaseSize(title),
      movement: parseMovement(title, series),
      caseMaterial: parseCaseMaterial(title),
      strapMaterial: parseStrap(title),
      dial: parseDial(title),
      gender: "MENS",
      category: inferCategory(series),
      url: `https://www.mayors.com${productPath}`,
    });
  }

  return products;
}

export async function downloadMayorsImages(
  product: MayorsProduct
): Promise<string[]> {
  const dir = path.join(
    process.cwd(),
    "public",
    "images",
    "watches",
    "jacob-co",
    product.sku
  );
  await mkdir(dir, { recursive: true });

  const saved: string[] = [];
  let index = 1;
  for (const imageUrl of product.imageUrls) {
    try {
      const res = await fetch(imageUrl, {
        headers: { "User-Agent": USER_AGENT, Accept: "image/*" },
      });
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 1000) continue;
      const filename = `${index}.jpg`;
      await writeFile(path.join(dir, filename), buffer);
      saved.push(`/images/watches/jacob-co/${product.sku}/${filename}`);
      index += 1;
    } catch {
      /* skip failed image */
    }
  }
  return saved;
}
