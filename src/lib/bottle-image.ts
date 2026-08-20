import { BOTTLE_SIZES, isBottleSize, type BottleSize } from "@/lib/bottle-sizes";
import { slugify } from "@/lib/utils";

export const BOTTLE_TEMPLATE_SRC = "/images/fragrances/bottle-template.jpg";

export const VARIATION_BOTTLE_SRC = {
  30: "/images/fragrances/variations/bottle-30.jpg",
  50: "/images/fragrances/variations/bottle-50.jpg",
  100: "/images/fragrances/variations/bottle-100.jpg",
} as const;

export function variationBottleSrc(size: number = 50): string {
  const ml: BottleSize = isBottleSize(size) ? size : 50;
  return VARIATION_BOTTLE_SRC[ml];
}

export function catalogFragranceSlug(
  brandSlug: string,
  model: string,
  reference: string
): string {
  return slugify(`${brandSlug}-${model}-${reference}`);
}

export function bottleImageSrc(slug: string, size: number = 50): string {
  const ml: BottleSize = isBottleSize(size) ? size : 50;
  return `/images/fragrances/bottles/${slug}-${ml}.webp`;
}

export function bottleImagesForSlug(slug: string): string[] {
  return BOTTLE_SIZES.map((size) => bottleImageSrc(slug, size));
}

/** Label line matching the template style, e.g. SAUVAGE DIOR. */
export function bottleLabelName(brand: string, model: string): string {
  const modelU = normalizeLabel(model);
  const brandU = normalizeLabel(brand);
  if (!modelU) return brandU;
  const brandParts = brandU.split(/[\s/-]+/).filter((part) => part.length > 2);
  if (brandParts.some((part) => modelU.includes(part))) return modelU;
  const combined = `${modelU} ${brandU}`.trim();
  if (combined.length > 28) return modelU;
  return combined;
}

function normalizeLabel(value: string): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
