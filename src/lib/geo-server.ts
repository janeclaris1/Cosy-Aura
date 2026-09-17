import { isCemacCountry } from "@/lib/flutterwave";
import { countryFromTimezone } from "@/lib/geo-resolve";
import { paymentRouteFromCountry } from "@/lib/geo-payment";
import { isPaystackCountry } from "@/lib/paystack";

export type CheckoutGateway = "paystack" | "flutterwave" | "stripe";

export function normalizeCountryCode(code: unknown): string | null {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized || normalized === "XX" || normalized === "T1") return null;
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

export function headerCountry(req: Request): string | null {
  const raw =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    req.headers.get("cloudfront-viewer-country") ||
    req.headers.get("x-country-code") ||
    req.headers.get("x-geo-country");
  return normalizeCountryCode(raw);
}

export function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = req.headers.get("x-real-ip")?.trim();
  const ip = forwarded || real || "";
  if (!ip || ip === "::1" || ip.startsWith("127.") || ip === "0.0.0.0") return null;
  return ip;
}

export async function countryFromIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const url = `https://ipwho.is/${encodeURIComponent(ip)}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { success?: boolean; country_code?: string };
    if (data.success === false) return null;
    return normalizeCountryCode(data.country_code);
  } catch {
    return null;
  }
}

export async function countryFromLatLng(lat: number, lng: number): Promise<string | null> {
  try {
    const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set("localityLanguage", "en");
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { countryCode?: string };
    return normalizeCountryCode(data.countryCode);
  } catch {
    return null;
  }
}

/** Best-effort country from request IP/headers (silent — no user prompt). */
export async function resolveServerCountry(req: Request): Promise<string | null> {
  let country = headerCountry(req);
  if (!country) {
    country = await countryFromIp(clientIp(req));
  }
  if (!country) {
    country =
      countryFromTimezone(req.headers.get("x-vercel-ip-timezone")) ||
      countryFromTimezone(req.headers.get("x-timezone"));
  }
  return country;
}

/**
 * Checkout country: form/body value wins over IP hint.
 * Used server-side so address beats geolocation.
 */
export function resolveCheckoutCountry(
  submitted: unknown,
  ipHint: string | null
): string | null {
  return normalizeCountryCode(submitted) || ipHint;
}

export function assertCheckoutGateway(
  country: unknown,
  gateway: CheckoutGateway
): { ok: true; country: string } | { ok: false; error: string; status: number } {
  const normalized = normalizeCountryCode(country);
  if (!normalized) {
    return { ok: false, error: "A valid country is required", status: 400 };
  }

  const route = paymentRouteFromCountry(normalized);
  if (route.provider === gateway) {
    return { ok: true, country: normalized };
  }

  if (gateway === "stripe") {
    if (isPaystackCountry(normalized)) {
      return {
        ok: false,
        error: "Use Paystack for Ghana and Nigeria checkout.",
        status: 400,
      };
    }
    if (isCemacCountry(normalized)) {
      return {
        ok: false,
        error: "Use Flutterwave for CEMAC checkout.",
        status: 400,
      };
    }
  }

  if (gateway === "paystack") {
    return {
      ok: false,
      error: "Paystack checkout is only available for Ghana and Nigeria.",
      status: 400,
    };
  }

  return {
    ok: false,
    error: "Flutterwave checkout is only available for CEMAC countries.",
    status: 400,
  };
}

export function logCheckoutCountryHintMismatch(
  submitted: string,
  ipHint: string | null,
  gateway: CheckoutGateway
) {
  if (!ipHint || ipHint === submitted) return;
  console.info("[checkout-geo] form country overrides ip hint", {
    submitted,
    ipHint,
    gateway,
  });
}
