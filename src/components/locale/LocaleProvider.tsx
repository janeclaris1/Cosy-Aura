"use client";

import { useEffect, useState } from "react";
import { isUiLang, type UiLang } from "@/lib/geo-locale";
import type { LocaleCookie } from "@/lib/locale-cookie";
import {
  initialLocaleFromCookie,
  useLocaleStore,
} from "@/lib/locale-store";
import {
  LocaleHydratedContext,
  LocaleSsrContext,
  LocaleSsrCountryContext,
} from "@/components/locale/locale-context";

/**
 * Aligns SSR text with the shopper cookie so hydration matches,
 * then hands off to the zustand locale store on the client.
 */
export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale?: LocaleCookie | null;
  children: React.ReactNode;
}) {
  const ssrLanguage: UiLang =
    initialLocale && isUiLang(initialLocale.language)
      ? initialLocale.language
      : "en";
  const ssrCountry =
    initialLocale?.country && /^[A-Za-z]{2}$/.test(initialLocale.country)
      ? initialLocale.country.toUpperCase()
      : null;
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const seeded = initialLocaleFromCookie(initialLocale);
    if (seeded.language) {
      const state = useLocaleStore.getState();
      if (!state.userOverrideLang) {
        useLocaleStore.setState({
          country: seeded.country ?? state.country,
          locale: seeded.locale ?? state.locale,
          language: seeded.language,
          currency: seeded.currency ?? state.currency,
          rates: seeded.rates ?? state.rates,
          ready: true,
        });
      } else {
        useLocaleStore.setState({ ready: true });
      }
    }
    setHydrated(true);
  }, [initialLocale]);

  return (
    <LocaleSsrContext.Provider value={ssrLanguage}>
      <LocaleSsrCountryContext.Provider value={ssrCountry}>
        <LocaleHydratedContext.Provider value={hydrated}>
          {children}
        </LocaleHydratedContext.Provider>
      </LocaleSsrCountryContext.Provider>
    </LocaleSsrContext.Provider>
  );
}
