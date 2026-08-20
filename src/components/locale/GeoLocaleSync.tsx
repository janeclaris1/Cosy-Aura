"use client";

import { useEffect } from "react";
import { isUiLang } from "@/lib/geo-locale";
import { useLocaleStore } from "@/lib/locale-store";

type GeoPayload = {
  country?: string | null;
  locale?: string;
  language?: string;
  displayCurrency?: string;
};

type FxPayload = {
  rates?: Record<string, number>;
};

export function GeoLocaleSync() {
  const applyDetected = useLocaleStore((s) => s.applyDetected);
  const setRates = useLocaleStore((s) => s.setRates);
  const setStorePricing = useLocaleStore((s) => s.setStorePricing);

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      try {
        const [geoRes, fxRes, configRes] = await Promise.all([
          fetch("/api/geo"),
          fetch("/api/fx"),
          fetch("/api/store-config"),
        ]);
        const geo = (await geoRes.json()) as GeoPayload;
        const fx = (await fxRes.json()) as FxPayload;
        const config = (await configRes.json()) as {
          nonAfricaMarkupEnabled?: boolean;
          nonAfricaMarkupUsd?: number;
        };
        if (cancelled) return;
        if (fx.rates) setRates(fx.rates);
        if (typeof config.nonAfricaMarkupEnabled === "boolean") {
          setStorePricing({
            nonAfricaMarkupEnabled: config.nonAfricaMarkupEnabled,
            nonAfricaMarkupUsd: Number(config.nonAfricaMarkupUsd) || 10,
          });
        }
        const language = isUiLang(geo.language) ? geo.language : "en";
        const prev = useLocaleStore.getState();
        applyDetected({
          // Keep a known country when geo cannot resolve (common on localhost).
          country: geo.country || prev.country || null,
          locale: geo.locale || (language === "en" ? "en-US" : language),
          language,
          currency: geo.country
            ? (geo.displayCurrency || "USD").toUpperCase()
            : prev.currency || (geo.displayCurrency || "USD").toUpperCase(),
        });
      } catch {
        if (!cancelled) {
          const prev = useLocaleStore.getState();
          applyDetected({
            country: prev.country || null,
            locale: prev.locale || "en-US",
            language: prev.language || "en",
            currency: prev.currency || "USD",
          });
        }
      }
    }

    void detect();
    return () => {
      cancelled = true;
    };
  }, [applyDetected, setRates, setStorePricing]);

  return null;
}
