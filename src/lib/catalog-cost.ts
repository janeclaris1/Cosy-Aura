import type { ProductType } from "@prisma/client";
import { isBottleSize, type BottleSize } from "@/lib/bottle-sizes";
import { isPerfumeProduct } from "@/lib/product-catalog";
import { roundGhs } from "@/lib/round-money";

/** Standard unit cost for perfume oils by bottle size (GHS). */
export const PERFUME_COST_GHS_BY_ML: Record<BottleSize, number> = {
  30: 45,
  50: 70,
  100: 150,
};

/** Standard unit cost for non-perfume catalog types (GHS). */
export const FLAT_PRODUCT_COST_GHS: Partial<Record<ProductType, number>> = {
  SUNGLASSES: 80,
  SNEAKER: 80,
  WATCH: 150,
};

export function perfumeCostGhs(bottleSizeMl: number): number {
  if (isBottleSize(bottleSizeMl)) return PERFUME_COST_GHS_BY_ML[bottleSizeMl];
  return 0;
}

/** Default catalog cost for a product row (before admin override). */
export function defaultCatalogCostPriceGhs(
  productType: ProductType | null | undefined,
  catalogBottleSize: number
): number {
  if (isPerfumeProduct(productType)) {
    return perfumeCostGhs(catalogBottleSize) || PERFUME_COST_GHS_BY_ML[50];
  }
  const flat = productType ? FLAT_PRODUCT_COST_GHS[productType] : undefined;
  return flat != null ? flat : 0;
}

/** Use explicit cost when set; otherwise apply standard catalog cost. */
export function resolveCostPriceGhs(
  productType: ProductType | null | undefined,
  catalogBottleSize: number,
  explicitCost?: number | null
): number {
  const explicit = Math.max(0, Number(explicitCost) || 0);
  if (explicit > 0) return roundGhs(explicit);
  return defaultCatalogCostPriceGhs(productType, catalogBottleSize);
}

/** @deprecated Use defaultCatalogCostPriceGhs(productType, bottleSize). */
export function defaultCostPriceGhs(
  _retailPriceGhs: number,
  productType?: ProductType | null,
  catalogBottleSize = 50
): number {
  return defaultCatalogCostPriceGhs(productType, catalogBottleSize);
}
