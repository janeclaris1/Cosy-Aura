import "server-only";

import type { ProductType } from "@prisma/client";
import { fetchRatesFromGhs } from "@/lib/fx";
import { applyRegionalMarkup } from "@/lib/regional-pricing";
import { getStorePricingConfig } from "@/lib/store-config";

export async function resolveRegionalPriceGhs(
  baseGhs: number,
  country: string | null | undefined,
  productType?: ProductType | null
): Promise<number> {
  const [config, fx] = await Promise.all([
    getStorePricingConfig(),
    fetchRatesFromGhs(),
  ]);

  return applyRegionalMarkup(baseGhs, {
    country,
    rates: fx.rates,
    enabled: config.nonAfricaMarkupEnabled,
    markupUsd: config.nonAfricaMarkupUsd,
    productType,
    catalogMarkupUsd: config.catalogMarkupUsd,
  });
}
