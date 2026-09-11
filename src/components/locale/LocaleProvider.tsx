"use client";

import { useEffect, useState } from "react";
import { isUiLang, type UiLang } from "@/lib/geo-locale";
import type { LocaleCookie } from "@/lib/locale-cookie";
import {
  initialLocaleFromCookie,
  useLocaleStore,
} from "@/lib/locale-store";
import { releaseMoneyHydrationLock, setMoneyDisplay } from "@/lib/money-display";
import {
  LocaleHydratedContext,
  LocaleSsrContext,
  LocaleSsrCountryContext,
  LocaleSsrCurrencyContext,
  LocaleSsrRatesContext,
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
  const ssrCurrency = (initialLocale?.currency || "GHS").toUpperCase();
  const ssrRates: Record<string, number> = {
    GHS: 1,
    ...(initialLocale?.currency && initialLocale.rate > 0
      ? { [ssrCurrency]: initialLocale.rate }
      : {}),
  };
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const finishHydration = () => {
      const seeded = initialLocaleFromCookie(initialLocale);
      const state = useLocaleStore.getState();

      if (seeded.language) {
        if (!state.userOverrideLang) {
          useLocaleStore.setState({
            country: seeded.country ?? state.country,
            locale: seeded.locale ?? state.locale,
            language: seeded.language,
            currency: state.userOverrideCurrency
              ? state.currency
              : (seeded.currency ?? state.currency),
            rates: seeded.rates ?? state.rates,
            ready: true,
          });
        } else {
          useLocaleStore.setState({ ready: true });
        }
      } else {
        useLocaleStore.setState({ ready: true });
      }

      const live = useLocaleStore.getState();
      setMoneyDisplay({ locale: live.locale, rates: live.rates });
      releaseMoneyHydrationLock();
      setHydrated(true);
    };

    const rehydrate = useLocaleStore.persist.rehydrate();
    if (rehydrate instanceof Promise) {
      void rehydrate.then(finishHydration);
    } else {
      finishHydration();
    }
  }, [initialLocale]);

  return (
    <LocaleSsrContext.Provider value={ssrLanguage}>
      <LocaleSsrCountryContext.Provider value={ssrCountry}>
        <LocaleSsrCurrencyContext.Provider value={ssrCurrency}>
          <LocaleSsrRatesContext.Provider value={ssrRates}>
            <LocaleHydratedContext.Provider value={hydrated}>
              {children}
            </LocaleHydratedContext.Provider>
          </LocaleSsrRatesContext.Provider>
        </LocaleSsrCurrencyContext.Provider>
      </LocaleSsrCountryContext.Provider>
    </LocaleSsrContext.Provider>
  );
}
