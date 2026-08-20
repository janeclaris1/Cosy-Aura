/**
 * Per-country stock for multi-shop catalogs (Ghana + Cameroon).
 */

export const MANAGED_STOCK_COUNTRIES = [
  { code: "GH", label: "Ghana" },
  { code: "CM", label: "Cameroon" },
] as const;

export type ManagedStockCountry = (typeof MANAGED_STOCK_COUNTRIES)[number]["code"];

/** CEMAC markets share Cameroon inventory unless overridden later. */
const CEMAC_TO_CM = new Set(["CM", "GA", "CG", "TD", "CF", "GQ"]);

export type CountryStockRow = {
  country: string;
  inStock: boolean;
};

/** Map shopper ISO country → inventory bucket we manage. */
export function stockCountryForShopper(
  country: string | null | undefined
): ManagedStockCountry | null {
  const code = String(country || "")
    .trim()
    .toUpperCase();
  if (code === "GH") return "GH";
  if (CEMAC_TO_CM.has(code)) return "CM";
  return null;
}

/**
 * Resolve whether a fragrance is buyable for the shopper's country.
 * - Managed country with a row → use that row
 * - Otherwise → fall back to global `stock > 0`
 */
export function resolveStockCountry(input: {
  country?: string | null;
  currency?: string | null;
}): ManagedStockCountry | null {
  const fromCountry = stockCountryForShopper(input.country);
  if (fromCountry) return fromCountry;
  const currency = String(input.currency || "").toUpperCase();
  if (currency === "GHS") return "GH";
  if (currency === "XAF") return "CM";
  return null;
}

export function isInStockForCountry(
  fragrance: {
    stock: number;
    countryStocks?: CountryStockRow[] | null;
  },
  shopperCountry: string | null | undefined,
  currency?: string | null
): boolean {
  const bucket = resolveStockCountry({ country: shopperCountry, currency });
  if (bucket && fragrance.countryStocks?.length) {
    const row = fragrance.countryStocks.find(
      (s) => s.country.toUpperCase() === bucket
    );
    if (row) return row.inStock;
  }
  return Number(fragrance.stock) > 0;
}

export function parseCountryStockInput(
  input: unknown
): Array<{ country: ManagedStockCountry; inStock: boolean }> {
  if (!Array.isArray(input)) return [];
  const allowed = new Set(MANAGED_STOCK_COUNTRIES.map((c) => c.code));
  const out: Array<{ country: ManagedStockCountry; inStock: boolean }> = [];
  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const country = String((row as { country?: string }).country || "")
      .trim()
      .toUpperCase();
    if (!allowed.has(country as ManagedStockCountry)) continue;
    out.push({
      country: country as ManagedStockCountry,
      inStock: Boolean((row as { inStock?: boolean }).inStock),
    });
  }
  return out;
}
