/**
 * GHSA-2xp9-vwfh-vxw4 — Next 14.x has no patched release yet. Patched 15.5.24+ adds
 * AVIF to BYPASS_TYPES so /_next/image serves AVIF as-is without sharp/libheif decode.
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

const src = fs.readFileSync(optimizerPath, "utf8");
const bypassStart = src.indexOf("const BYPASS_TYPES = [");
const bypassEnd = src.indexOf("const BLUR_IMG_SIZE", bypassStart);

if (bypassStart === -1 || bypassEnd === -1) {
  console.warn("[postinstall] Next.js image optimizer layout changed — check AVIF bypass");
  process.exit(0);
}

const bypassBlock = src.slice(bypassStart, bypassEnd);
if (/\bAVIF\b/.test(bypassBlock)) {
  console.log("[postinstall] Next.js AVIF bypass already applied");
  process.exit(0);
}

const patterns = [
  ["    HEIC\n];", "    HEIC,\n    AVIF\n];"],
  ["    HEIC,\n];", "    HEIC,\n    AVIF\n];"],
];

let next = src;
let applied = false;
for (const [from, to] of patterns) {
  if (next.includes(from)) {
    next = next.replace(from, to);
    applied = true;
    break;
  }
}

if (!applied) {
  console.warn(
    "[postinstall] Could not patch Next.js AVIF bypass — upgrade to next@15.5.24+ when ready"
  );
  process.exit(0);
}

fs.writeFileSync(optimizerPath, next);
console.log("[postinstall] Applied AVIF bypass patch (GHSA-2xp9-vwfh-vxw4)");
