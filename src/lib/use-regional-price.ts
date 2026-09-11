"use client";

import { useMemo } from "react";
import { applyRegionalMarkup, isAfricanCountry } from "@/lib/regional-pricing";
import {
  useShopperCountry,
  useShopperRates,
  useShopperStorePricing,
} from "@/lib/locale-store";

/** Applies regional markup to a GHS base price for the current shopper. */
export function useRegionalPrice(baseGhs: number): number {
  const country = useShopperCountry();
  const rates = useShopperRates();
  const { nonAfricaMarkupEnabled: enabled, nonAfricaMarkupUsd: markupUsd } =
    useShopperStorePricing();

  return useMemo(
    () =>
      applyRegionalMarkup(baseGhs, {
        country,
        rates,
        enabled,
        markupUsd,
      }),
    [baseGhs, country, rates, enabled, markupUsd]
  );
}

export function useInternationalPricingActive(): boolean {
  const country = useShopperCountry();
  const { nonAfricaMarkupEnabled: enabled } = useShopperStorePricing();
  return enabled && country !== null && !isAfricanCountry(country);
}
