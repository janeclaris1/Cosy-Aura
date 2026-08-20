import { rateFromGhs } from "@/lib/fx";

export const CEMAC_COUNTRIES = [
  { code: "CM", name: "Cameroon" },
  { code: "GA", name: "Gabon" },
  { code: "CG", name: "Republic of the Congo" },
  { code: "TD", name: "Chad" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "CF", name: "Central African Republic" },
] as const;

export type CemacCountry = (typeof CEMAC_COUNTRIES)[number]["code"];

export function isCemacCountry(code: string | null | undefined): code is CemacCountry {
  return CEMAC_COUNTRIES.some((country) => country.code === code);
}

export function cemacCountryName(code: string): string {
  return CEMAC_COUNTRIES.find((country) => country.code === code)?.name || code;
}

export function flutterwaveSecret(): string | null {
  const key = process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY || "";
  return key.startsWith("FLWSECK") ? key : null;
}

/** Catalog is GHS. CEMAC settles in XAF (zero-decimal). Uses the same FX as the storefront. */
export function flutterwaveCharge(
  ghsTotal: number,
  rates?: Record<string, number>
): {
  amount: number;
  currency: "XAF";
  displayTotal: number;
} {
  const rate = rateFromGhs(rates, "XAF");
  const xaf = ghsTotal * rate;
  return {
    amount: Math.round(xaf),
    currency: "XAF",
    displayTotal: xaf,
  };
}

type FlwInitResponse = {
  status: string;
  message: string;
  data?: { link?: string };
};

export async function initializeFlutterwavePayment(input: {
  txRef: string;
  amount: number;
  currency: string;
  redirectUrl: string;
  email: string;
  name: string;
  phone: string;
  title: string;
  description: string;
  meta: Record<string, string>;
}): Promise<FlwInitResponse> {
  const secret = flutterwaveSecret();
  if (!secret) return { status: "error", message: "Flutterwave is not configured" };

  // Flutterwave's edge WAF returns HTML 403 for some strings (e.g. "Order #", unicode ·).
  const safeDescription = input.description
    .replace(/Order\s*#/gi, "Order ")
    .replace(/[·•]/g, "-")
    .replace(/#/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .trim()
    .slice(0, 100);

  const safeName = String(input.name || "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .slice(0, 80);
  const safePhone = String(input.phone || "").replace(/[^\d+]/g, "").slice(0, 20);

  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "CosyAuraCheckout/1.0",
    },
    body: JSON.stringify({
      tx_ref: input.txRef,
      amount: input.amount,
      currency: input.currency,
      redirect_url: input.redirectUrl,
      // Central Africa (XAF): card + francophone mobile money
      payment_options: "card,mobilemoneyxaf",
      customer: {
        email: input.email,
        name: safeName || "Customer",
        ...(safePhone ? { phonenumber: safePhone } : {}),
      },
      customizations: {
        title: input.title.replace(/[^\x20-\x7E]/g, "").trim() || "COSY AURA",
        description: safeDescription || "COSY AURA order",
      },
      meta: input.meta,
    }),
  });

  const raw = await res.text();
  try {
    return JSON.parse(raw) as FlwInitResponse;
  } catch {
    console.error("[flutterwave] non-JSON response", res.status, raw.slice(0, 200));
    return {
      status: "error",
      message: res.ok
        ? "Flutterwave returned an invalid response"
        : `Flutterwave could not start checkout (${res.status}). Please try again.`,
    };
  }
}

export type FlutterwaveVerifiedTxn = {
  status: string;
  message: string;
  data?: {
    id: number;
    tx_ref: string;
    flw_ref?: string;
    amount: number;
    currency: string;
    status: string;
    customer?: { email?: string; name?: string; phone_number?: string; phonenumber?: string };
    meta?: Record<string, string>;
  };
};

export async function verifyFlutterwaveTransaction(input: {
  txRef?: string;
  transactionId?: string | number;
}): Promise<FlutterwaveVerifiedTxn> {
  const secret = flutterwaveSecret();
  if (!secret) return { status: "error", message: "Flutterwave is not configured" };

  const url = input.transactionId
    ? `https://api.flutterwave.com/v3/transactions/${input.transactionId}/verify`
    : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(
        String(input.txRef || "")
      )}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  return (await res.json()) as FlutterwaveVerifiedTxn;
}

export function verifyFlutterwaveSignature(signature: string | null): boolean {
  const hash = process.env.FLW_SECRET_HASH || process.env.FLUTTERWAVE_SECRET_HASH;
  if (!hash || !signature) return false;
  return signature === hash;
}
