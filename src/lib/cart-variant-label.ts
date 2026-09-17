import type { ProductType } from "@prisma/client";
import { isBottleSize } from "@/lib/bottle-sizes";
import { isSneakerEuSize } from "@/lib/sneaker-sizes";

/** Human-readable variant label for cart and checkout line items. */
export function cartVariantLabel(
  productType: ProductType | undefined,
  bottleSize: number | undefined
): string | null {
  if (bottleSize == null) return null;
  if (productType === "SNEAKER" && isSneakerEuSize(bottleSize)) {
    return `EU ${bottleSize}`;
  }
  if (isBottleSize(bottleSize)) return `${bottleSize} ml`;
  if (productType === "SHIRT") return `Size ${bottleSize}`;
  return null;
}
