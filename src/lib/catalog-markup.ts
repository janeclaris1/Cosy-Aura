import type { ProductType } from "@prisma/client";
import { CATALOG_PRODUCT_TYPES } from "@/lib/product-catalog";

export type CatalogMarkupUsd = Partial<Record<ProductType, number>>;

export function parseCatalogMarkupUsd(raw: unknown): CatalogMarkupUsd {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: CatalogMarkupUsd = {};
  for (const type of CATALOG_PRODUCT_TYPES) {
    const value = (raw as Record<string, unknown>)[type];
    if (value === undefined || value === null || value === "") continue;
    const num = Number(value);
    if (Number.isFinite(num) && num >= 0) {
      out[type] = num;
    }
  }
  return out;
}

/** Per-catalog override, else global default surcharge. */
export function resolveCatalogMarkupUsd(
  productType: ProductType | null | undefined,
  catalogMarkupUsd: CatalogMarkupUsd | undefined,
  globalMarkupUsd: number
): number {
  const global = Math.max(0, Number(globalMarkupUsd) || 0);
  if (!productType) return global;
  const override = catalogMarkupUsd?.[productType];
  if (override === undefined || override === null) return global;
  const num = Number(override);
  return Number.isFinite(num) && num >= 0 ? num : global;
}
