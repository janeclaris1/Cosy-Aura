"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import type { ProductType } from "@prisma/client";
import { isGuestPriceHidden } from "@/lib/catalog-price-visibility";
import { CATALOGS, type CatalogSlug } from "@/lib/product-catalog";
import { useGuestHiddenPriceCatalogs } from "@/lib/locale-store";

export function useGuestHiddenPriceCatalogsList(): ProductType[] {
  return useGuestHiddenPriceCatalogs();
}

export function useIsCatalogPriceHidden(
  productType: ProductType | undefined | null
): boolean {
  const hidden = useGuestHiddenPriceCatalogsList();
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";
  return isGuestPriceHidden(productType, hidden, isLoggedIn);
}

export function useCatalogPathPriceHidden(catalogPath?: string): boolean {
  const hidden = useGuestHiddenPriceCatalogsList();
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";
  if (isLoggedIn || !catalogPath) return false;
  const match = Object.values(CATALOGS).find((c) => c.path === catalogPath);
  if (!match) return false;
  return isGuestPriceHidden(match.productType, hidden, false);
}

export function catalogSlugForProductType(
  productType: ProductType
): CatalogSlug | undefined {
  return Object.values(CATALOGS).find((c) => c.productType === productType)?.slug;
}

export function useGuestPriceHiddenChecker() {
  const hidden = useGuestHiddenPriceCatalogsList();
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";

  return useCallback(
    (productType?: ProductType | null) =>
      isGuestPriceHidden(productType, hidden, isLoggedIn),
    [hidden, isLoggedIn]
  );
}
