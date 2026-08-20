/** Approximate mid-market fallbacks: 1 GHS → currency. Live rates replace these. */
export const FALLBACK_RATES_FROM_GHS: Record<string, number> = {
  GHS: 1,
  USD: 0.065,
  EUR: 0.06,
  GBP: 0.051,
  NGN: 100,
  XAF: 42,
  XOF: 42,
  CAD: 0.089,
  AUD: 0.1,
  NZD: 0.11,
  AED: 0.239,
  SAR: 0.244,
  ZAR: 1.18,
  KES: 8.4,
  INR: 5.6,
  CHF: 0.052,
  JPY: 10.1,
  CNY: 0.47,
  HKD: 0.51,
  SGD: 0.088,
  BRL: 0.36,
  MXN: 1.2,
  PLN: 0.24,
  SEK: 0.62,
  NOK: 0.66,
  DKK: 0.45,
  TRY: 2.2,
  EGP: 3.2,
  MAD: 0.64,
};

function envOverrides(): Record<string, number> {
  const ngn = Number(process.env.GHS_TO_NGN);
  const xaf = Number(process.env.GHS_TO_XAF);
  const out: Record<string, number> = {};
  if (Number.isFinite(ngn) && ngn > 0) out.NGN = ngn;
  if (Number.isFinite(xaf) && xaf > 0) {
    out.XAF = xaf;
    out.XOF = xaf;
  }
  return out;
}

type OpenErResponse = {
  result?: string;
  rates?: Record<string, number>;
};

export async function fetchRatesFromGhs(): Promise<{
  rates: Record<string, number>;
  source: "live" | "fallback";
}> {
  const fallback = { ...FALLBACK_RATES_FROM_GHS, ...envOverrides() };
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 6 * 60 * 60 },
    });
    if (!res.ok) return { rates: fallback, source: "fallback" };
    const data = (await res.json()) as OpenErResponse;
    const usdRates = data.rates;
    const ghsPerUsd = usdRates?.GHS;
    if (data.result !== "success" || !usdRates || !ghsPerUsd || ghsPerUsd <= 0) {
      return { rates: fallback, source: "fallback" };
    }

    const rates: Record<string, number> = { GHS: 1 };
    for (const [code, perUsd] of Object.entries(usdRates)) {
      if (!Number.isFinite(perUsd) || perUsd <= 0) continue;
      rates[code] = perUsd / ghsPerUsd;
    }
    return { rates: { ...fallback, ...rates, ...envOverrides() }, source: "live" };
  } catch {
    return { rates: fallback, source: "fallback" };
  }
}

export function rateFromGhs(
  rates: Record<string, number> | undefined,
  currency: string
): number {
  const code = (currency || "GHS").toUpperCase();
  if (code === "GHS") return 1;
  const rate = rates?.[code];
  if (Number.isFinite(rate) && (rate as number) > 0) return rate as number;
  const fallback = FALLBACK_RATES_FROM_GHS[code];
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 1;
}

/** Shipping method prices are stored in USD — convert to catalog GHS. */
export function shippingUsdToGhs(
  amountUsd: number,
  rates?: Record<string, number>
): number {
  const usd = Number(amountUsd) || 0;
  if (usd <= 0) return 0;
  const usdPerGhs = rateFromGhs(rates, "USD");
  return usdPerGhs > 0 ? usd / usdPerGhs : usd;
}
