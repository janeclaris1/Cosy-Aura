/**
 * Block libheif/HEIF decode in sharp (GHSA libheif RCE mitigation).
 * Safe to import multiple times — sharp.block is idempotent for the process.
 */
import sharp from "sharp";

if (typeof sharp.block === "function") {
  sharp.block({ operation: ["VipsForeignLoadHeif"] });
}
