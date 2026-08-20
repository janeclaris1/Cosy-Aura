/** ISO 3166-1 alpha-2 codes for African countries and territories. */
export const AFRICAN_COUNTRY_CODES = new Set([
  "DZ",
  "AO",
  "BJ",
  "BW",
  "BF",
  "BI",
  "CV",
  "CM",
  "CF",
  "TD",
  "KM",
  "CD",
  "CG",
  "CI",
  "DJ",
  "EG",
  "GQ",
  "ER",
  "SZ",
  "ET",
  "GA",
  "GM",
  "GH",
  "GN",
  "GW",
  "KE",
  "LS",
  "LR",
  "LY",
  "MG",
  "MW",
  "ML",
  "MR",
  "MU",
  "YT",
  "MA",
  "MZ",
  "NA",
  "NE",
  "NG",
  "RE",
  "RW",
  "SH",
  "ST",
  "SN",
  "SC",
  "SL",
  "SO",
  "ZA",
  "SS",
  "SD",
  "TZ",
  "TG",
  "TN",
  "UG",
  "EH",
  "ZM",
  "ZW",
]);

export function isAfricanCountry(country: string | null | undefined): boolean {
  const code = String(country || "")
    .trim()
    .toUpperCase();
  if (!code) return true;
  return AFRICAN_COUNTRY_CODES.has(code);
}

export type RegionalPricingOptions = {
  country: string | null | undefined;
  rates: Record<string, number>;
  enabled: boolean;
  markupUsd: number;
};

/**
 * Applies a flat USD surcharge for shoppers outside Africa.
 * Base and result amounts are in GHS (catalog currency).
 */
export function applyRegionalMarkup(
  baseGhs: number,
  options: RegionalPricingOptions
): number {
  const base = Number(baseGhs) || 0;
  if (!options.enabled || isAfricanCountry(options.country)) {
    return base;
  }

  const markupUsd = Math.max(0, Number(options.markupUsd) || 0);
  if (markupUsd <= 0) return base;

  const usdRate = options.rates?.USD;
  if (!Number.isFinite(usdRate) || (usdRate as number) <= 0) {
    return base;
  }

  const baseUsd = base * (usdRate as number);
  const markedUpUsd = baseUsd + markupUsd;
  const markedUpGhs = markedUpUsd / (usdRate as number);
  return Math.round(markedUpGhs * 100) / 100;
}
