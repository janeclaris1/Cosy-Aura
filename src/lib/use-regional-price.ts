"use client";

import { useMemo } from "react";
import { applyRegionalMarkup, isAfricanCountry } from "@/lib/regional-pricing";
import { useLocaleStore } from "@/lib/locale-store";

/** Applies regional markup to a GHS base price for the current shopper. */
export function useRegionalPrice(baseGhs: number): number {
  const country = useLocaleStore((s) => s.country);
  const rates = useLocaleStore((s) => s.rates);
  const enabled = useLocaleStore((s) => s.nonAfricaMarkupEnabled);
  const markupUsd = useLocaleStore((s) => s.nonAfricaMarkupUsd);

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
  const country = useLocaleStore((s) => s.country);
  const enabled = useLocaleStore((s) => s.nonAfricaMarkupEnabled);
  return enabled && country !== null && !isAfricanCountry(country);
}
