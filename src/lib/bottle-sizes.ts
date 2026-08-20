import { salePriceForSize } from "@/lib/pricing";

/** Standard retail bottle sizes for Cosy Aura fragrances */
export const BOTTLE_SIZES = [30, 50, 100] as const;
export type BottleSize = (typeof BOTTLE_SIZES)[number];

export function isBottleSize(n: number): n is BottleSize {
  return (BOTTLE_SIZES as readonly number[]).includes(n);
}

/**
 * Sale price for a selected size (GHS list minus store discount).
 * `seed` (slug) picks the 100ml tier: 380 / 390 / 420 before discount.
 */
export function priceForBottleSize(
  _basePrice: number,
  _baseSize: number,
  selectedSize: BottleSize,
  seed = ""
): number {
  return salePriceForSize(selectedSize, seed);
}
