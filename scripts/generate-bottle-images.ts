import fs from "fs";
import path from "path";
import sharp from "sharp";
import { catalog } from "../prisma/oil-catalog";
import { BOTTLE_SIZES } from "../src/lib/bottle-sizes";
import {
  bottleImageSrc,
  bottleLabelName,
  catalogFragranceSlug,
} from "../src/lib/bottle-image";

const ROOT = path.join(__dirname, "..");
const TEMPLATE = path.join(ROOT, "public/images/fragrances/bottle-template.jpg");
const OUT_DIR = path.join(ROOT, "public/images/fragrances/bottles");

const LABEL = { left: 402, top: 194, width: 136, height: 176 };

const FONT_SERIF = path.join(ROOT, "assets/fonts/Georgia-Bold.ttf");
const FONT_SANS = path.join(ROOT, "assets/fonts/Arial.ttf");
const FONT_SANS_BOLD = path.join(ROOT, "assets/fonts/Arial-Bold.ttf");

function wrapWords(text: string, maxChars: number, maxLines = 3): string[] {
  const words = text.split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) {
        const rest = [current, ...words.slice(words.indexOf(word) + 1)].join(" ");
        lines.push(rest);
        return lines;
      }
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function labelSvg(name: string, sizeMl: number, strength = "PERFUME OIL"): Buffer {
  const lines =
    name.length > 18 ? wrapWords(name, 12) : wrapWords(name, 14);
  const nameSize = lines.length >= 3 ? 10 : lines.length === 2 ? 12 : name.length > 12 ? 12 : 14;
  const startY = 78 - ((lines.length - 1) * (nameSize + 3)) / 2;

  const nameTspans = lines
    .map((line, i) => {
      const y = startY + i * (nameSize + 4);
      return `<text x="68" y="${y}" text-anchor="middle" font-family="Georgia" font-size="${nameSize}" font-weight="700" fill="#111">${escapeXml(line)}</text>`;
    })
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${LABEL.width}" height="${LABEL.height}" viewBox="0 0 ${LABEL.width} ${LABEL.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face { font-family: "Georgia"; src: url("file://${FONT_SERIF}"); }
      @font-face { font-family: "Arial"; src: url("file://${FONT_SANS}"); }
      @font-face { font-family: "ArialBold"; src: url("file://${FONT_SANS_BOLD}"); }
    </style>
  </defs>
  <rect x="1" y="1" width="${LABEL.width - 2}" height="${LABEL.height - 2}" rx="2" fill="#fbfbfa" stroke="#c5a35a" stroke-width="1.6"/>
  <text x="68" y="28" text-anchor="middle" font-family="ArialBold, Arial" font-size="8.5" letter-spacing="1.6" fill="#161616">COSY AURA</text>
  <line x1="28" y1="36" x2="108" y2="36" stroke="#c5a35a" stroke-width="0.9"/>
  ${nameTspans}
  <text x="68" y="132" text-anchor="middle" font-family="Arial" font-size="7" letter-spacing="1.8" fill="#1a1a1a">${escapeXml(strength)}</text>
  <text x="68" y="154" text-anchor="middle" font-family="ArialBold, Arial" font-size="9" letter-spacing="0.8" fill="#161616">| ${sizeMl}ML</text>
</svg>`;
  return Buffer.from(svg);
}

async function renderOne(
  slug: string,
  brand: string,
  model: string,
  sizeMl: number,
  strength = "PERFUME OIL"
) {
  const name = bottleLabelName(brand, model);
  const overlay = await sharp(labelSvg(name, sizeMl, strength)).png().toBuffer();
  const dest = path.join(ROOT, "public", bottleImageSrc(slug, sizeMl).slice(1));
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await sharp(TEMPLATE)
    .composite([{ input: overlay, left: LABEL.left, top: LABEL.top }])
    .webp({ quality: 80 })
    .toFile(dest);
  return dest;
}

async function main() {
  if (!fs.existsSync(TEMPLATE)) {
    throw new Error(`Missing bottle template at ${TEMPLATE}`);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let count = 0;
  const only = process.argv[2]?.toLowerCase();
  for (const item of catalog) {
    const slug = catalogFragranceSlug(item.brandSlug, item.model, item.reference);
    if (only && !slug.includes(only) && item.reference.toLowerCase() !== only) continue;
    for (const size of BOTTLE_SIZES) {
      await renderOne(
        slug,
        item.brand,
        item.model,
        size,
        item.concentration === "EDP" ? "EDP" : "PERFUME OIL"
      );
      count += 1;
    }
  }
  console.log(`Generated ${count} bottle images in ${path.relative(ROOT, OUT_DIR)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
