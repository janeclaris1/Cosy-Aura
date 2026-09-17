/**
 * GHSA-2xp9-vwfh-vxw4 / libheif — Next 14.x has no patched release yet.
 * - Adds AVIF to BYPASS_TYPES (patched 15.5.24+ behavior)
 * - Calls sharp.block({ operation: ["VipsForeignLoadHeif"] }) after sharp loads
 */
import fs from "fs";
import path from "path";

const optimizerPath = path.join(
  process.cwd(),
  "node_modules/next/dist/server/image-optimizer.js"
);

if (!fs.existsSync(optimizerPath)) {
  process.exit(0);
}

let src = fs.readFileSync(optimizerPath, "utf8");
let changed = false;

const bypassStart = src.indexOf("const BYPASS_TYPES = [");
const bypassEnd = src.indexOf("const BLUR_IMG_SIZE", bypassStart);

if (bypassStart !== -1 && bypassEnd !== -1) {
  const bypassBlock = src.slice(bypassStart, bypassEnd);
  if (!/\bAVIF\b/.test(bypassBlock)) {
    const patterns = [
      ["    HEIC\n];", "    HEIC,\n    AVIF\n];"],
      ["    HEIC,\n];", "    HEIC,\n    AVIF\n];"],
    ];
    for (const [from, to] of patterns) {
      if (src.includes(from)) {
        src = src.replace(from, to);
        changed = true;
        console.log("[postinstall] Added AVIF to Next.js BYPASS_TYPES");
        break;
      }
    }
    if (!changed) {
      console.warn(
        "[postinstall] Could not patch Next.js AVIF bypass — upgrade to next@15.5.24+ when ready"
      );
    }
  }
}

const sharpBlockSnippet = `    if (typeof sharp.block === "function") {
        sharp.block({ operation: ["VipsForeignLoadHeif"] });
    }`;

if (
  src.includes('sharp = require(process.env.NEXT_SHARP_PATH || "sharp");') &&
  !src.includes("VipsForeignLoadHeif")
) {
  src = src.replace(
    'sharp = require(process.env.NEXT_SHARP_PATH || "sharp");',
    `sharp = require(process.env.NEXT_SHARP_PATH || "sharp");\n${sharpBlockSnippet}`
  );
  changed = true;
  console.log("[postinstall] Applied sharp.block(VipsForeignLoadHeif) in image optimizer");
}

if (changed) {
  fs.writeFileSync(optimizerPath, src);
} else {
  console.log("[postinstall] Next.js image security patches already applied");
}
