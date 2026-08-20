"use client";

import { useEffect, useState } from "react";

export type WhatsAppResolve = {
  masterEnabled?: boolean;
  enabled: boolean;
  country: string | null;
  phone: string | null;
  waMeUrl: string | null;
};

const CURRENCY_COUNTRY: Record<string, string> = {
  GHS: "GH",
  NGN: "NG",
  XAF: "CM",
  XOF: "CI",
  KES: "KE",
  ZAR: "ZA",
};

let cache: { country: string; data: WhatsAppResolve; at: number } | null = null;
const inflightByCountry = new Map<string, Promise<WhatsAppResolve>>();
const CACHE_MS = 60_000;

export function countryFromCurrency(currency: string | null | undefined): string | null {
  const code = CURRENCY_COUNTRY[String(currency || "").toUpperCase()];
  return code || null;
}

export function resolveShopperCountry(input: {
  override?: string | null;
  localeCountry?: string | null;
  currency?: string | null;
}): string | null {
  const override = String(input.override || "")
    .trim()
    .toUpperCase();
  if (/^[A-Z]{2}$/.test(override)) return override;
  const locale = String(input.localeCountry || "")
    .trim()
    .toUpperCase();
  if (/^[A-Z]{2}$/.test(locale)) return locale;
  return countryFromCurrency(input.currency);
}

export async function fetchWhatsAppCheckout(country: string): Promise<WhatsAppResolve> {
  const code = country.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return { enabled: false, country: null, phone: null, waMeUrl: null };
  }
  if (cache && cache.country === code && Date.now() - cache.at < CACHE_MS) {
    return cache.data;
  }
  const existing = inflightByCountry.get(code);
  if (existing) return existing;

  const request = fetch(`/api/store/whatsapp-checkout?country=${encodeURIComponent(code)}`)
    .then(async (res) => {
      const data = (await res.json()) as WhatsAppResolve;
      cache = { country: code, data, at: Date.now() };
      return data;
    })
    .catch(() => ({
      enabled: false,
      country: code,
      phone: null,
      waMeUrl: null,
    }))
    .finally(() => {
      inflightByCountry.delete(code);
    });

  inflightByCountry.set(code, request);
  return request;
}

/** Hook: resolve WhatsApp CTA for the shopper's country. */
export function useWhatsAppCheckoutConfig(input: {
  override?: string | null;
  localeCountry?: string | null;
  currency?: string | null;
}) {
  const country = resolveShopperCountry(input);
  const [cfg, setCfg] = useState<WhatsAppResolve | null>(null);

  useEffect(() => {
    if (!country) {
      setCfg(null);
      return;
    }
    let cancelled = false;
    void fetchWhatsAppCheckout(country).then((data) => {
      if (!cancelled) setCfg(data);
    });
    return () => {
      cancelled = true;
    };
  }, [country]);

  return { country, cfg };
}
