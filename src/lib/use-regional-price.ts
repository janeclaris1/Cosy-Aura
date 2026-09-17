"use client";

import type { ProductType } from "@prisma/client";
import { useMemo } from "react";
import { applyRegionalMarkup, isAfricanCountry } from "@/lib/regional-pricing";
import {
  useShopperCountry,
  useShopperRates,
  useShopperStorePricing,
} from "@/lib/locale-store";

/** Applies regional markup to a GHS base price for the current shopper. */
export function useRegionalPrice(
  baseGhs: number,
  productType?: ProductType | null
): number {
  const country = useShopperCountry();
  const rates = useShopperRates();
  const {
    nonAfricaMarkupEnabled: enabled,
    nonAfricaMarkupUsd: markupUsd,
    catalogMarkupUsd,
  } = useShopperStorePricing();

  return useMemo(
    () =>
      applyRegionalMarkup(baseGhs, {
        country,
        rates,
        enabled,
        markupUsd,
        productType,
        catalogMarkupUsd,
      }),
    [baseGhs, country, rates, enabled, markupUsd, productType, catalogMarkupUsd]
  );
}

export function useInternationalPricingActive(): boolean {
  const country = useShopperCountry();
  const { nonAfricaMarkupEnabled: enabled } = useShopperStorePricing();
  return enabled && country !== null && !isAfricanCountry(country);
}
