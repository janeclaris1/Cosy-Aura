import { NextResponse } from "next/server";
import { paymentRouteFromCountry } from "@/lib/geo-payment";
import {
  countryFromLatLng,
  headerCountry,
  resolveServerCountry,
} from "@/lib/geo-server";
import {
  languageFromAcceptLanguage,
  localeProfileFromCountry,
} from "@/lib/geo-locale";

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
    country = await resolveServerCountry(req);
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
