import type { ProductType } from "@prisma/client";
import { CATALOG_PRODUCT_TYPES, isPerfumeProduct } from "@/lib/product-catalog";

const VALID_TYPES = new Set<ProductType>(CATALOG_PRODUCT_TYPES);

export function parseGuestHiddenPriceCatalogs(raw: unknown): ProductType[] {
  if (!Array.isArray(raw)) return [];
  const out: ProductType[] = [];
  for (const entry of raw) {
    const value = String(entry || "")
      .trim()
      .toUpperCase() as ProductType;
    if (!VALID_TYPES.has(value) || isPerfumeProduct(value)) continue;
    if (!out.includes(value)) out.push(value);
  }
  return out;
}

export function isGuestPriceHidden(
  productType: ProductType | undefined | null,
  hiddenCatalogs: ProductType[],
  isLoggedIn: boolean
): boolean {
  if (isLoggedIn || isPerfumeProduct(productType)) return false;
  const type = productType ?? "PERFUME";
  return hiddenCatalogs.includes(type);
}

export function shouldShowCatalogPrice(
  productType: ProductType | undefined | null,
  hiddenCatalogs: ProductType[],
  isLoggedIn: boolean
): boolean {
  return !isGuestPriceHidden(productType, hiddenCatalogs, isLoggedIn);
}
