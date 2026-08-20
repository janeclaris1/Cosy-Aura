import { NextResponse } from "next/server";
import { paymentRouteFromCountry } from "@/lib/geo-payment";
import {
  languageFromAcceptLanguage,
  localeProfileFromCountry,
} from "@/lib/geo-locale";

function headerCountry(req: Request): string | null {
  const raw =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    req.headers.get("cloudfront-viewer-country") ||
    req.headers.get("x-country-code") ||
    req.headers.get("x-geo-country");
  const code = raw?.trim().toUpperCase();
  if (!code || code === "XX" || code === "T1") return null;
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = req.headers.get("x-real-ip")?.trim();
  const ip = forwarded || real || "";
  if (!ip || ip === "::1" || ip.startsWith("127.") || ip === "0.0.0.0") return null;
  return ip;
}

async function countryFromIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const url = `https://ipwho.is/${encodeURIComponent(ip)}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { success?: boolean; country_code?: string };
    if (data.success === false) return null;
    const code = String(data.country_code || "").toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}

async function countryFromLatLng(lat: number, lng: number): Promise<string | null> {
  try {
    const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set("localityLanguage", "en");
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { countryCode?: string };
    const code = String(data.countryCode || "").toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  let country: string | null = null;
  let source: "gps" | "header" | "ip" | "fallback" = "fallback";

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    country = await countryFromLatLng(lat, lng);
    if (country) source = "gps";
  }

  if (!country) {
    country = headerCountry(req);
    if (country) source = "header";
  }

  if (!country) {
    country = await countryFromIp(clientIp(req));
    if (country) source = "ip";
  }

  const route = paymentRouteFromCountry(country);
  const acceptLang = languageFromAcceptLanguage(req.headers.get("accept-language"));
  const profile = country
    ? localeProfileFromCountry(country)
    : {
        country: null,
        currency: "USD",
        language: acceptLang,
        locale: acceptLang === "en" ? "en-US" : acceptLang,
      };

  return NextResponse.json({
    ...route,
    locale: profile.locale,
    language: profile.language,
    displayCurrency: profile.currency,
    source: country ? source : "fallback",
  });
}
