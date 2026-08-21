"use client";

import { useContext } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  isUiLang,
  localeForCountry,
  type UiLang,
} from "@/lib/geo-locale";
import { rateFromGhs } from "@/lib/fx";
import { writeLocaleCookie, type LocaleCookie } from "@/lib/locale-cookie";
import { setMoneyDisplay } from "@/lib/money-display";
import { translate } from "@/lib/i18n";
import { useCartStore } from "@/lib/store";
import {
  LocaleHydratedContext,
  LocaleSsrContext,
} from "@/components/locale/locale-context";

type LocaleState = {
  country: string | null;
  locale: string;
  language: UiLang;
  currency: string;
  rates: Record<string, number>;
  nonAfricaMarkupEnabled: boolean;
  nonAfricaMarkupUsd: number;
  userOverrideLang: boolean;
  userOverrideCurrency: boolean;
  ready: boolean;
  applyDetected: (next: {
    country: string | null;
    locale: string;
    language: UiLang;
    currency: string;
  }) => void;
  setRates: (rates: Record<string, number>) => void;
  setStorePricing: (config: {
    nonAfricaMarkupEnabled: boolean;
    nonAfricaMarkupUsd: number;
  }) => void;
  setLanguage: (language: UiLang) => void;
  setCurrency: (currency: string) => void;
  /** Force country + currency for checkout region changes (ignores prior overrides). */
  applyCheckoutRegion: (next: {
    country: string | null;
    currency: string;
  }) => void;
};

function persistPrefs(state: Pick<LocaleState, "language" | "currency" | "locale" | "country" | "rates">) {
  const rate = rateFromGhs(state.rates, state.currency);
  setMoneyDisplay({ locale: state.locale, rates: state.rates });
  writeLocaleCookie({
    language: state.language,
    currency: state.currency,
    locale: state.locale,
    country: state.country,
    rate,
  });
  useCartStore.getState().setCurrency(state.currency);
  if (typeof document !== "undefined") {
    document.documentElement.lang = state.locale || state.language;
  }
}

export function initialLocaleFromCookie(cookie: LocaleCookie | null | undefined): Partial<LocaleState> {
  if (!cookie || !isUiLang(cookie.language)) return {};
  return {
    language: cookie.language,
    currency: cookie.currency,
    locale: cookie.locale,
    country: cookie.country,
    rates: {
      GHS: 1,
      [cookie.currency]: cookie.rate > 0 ? cookie.rate : 1,
    },
    ready: true,
  };
}

/** Prefer cookie/window snapshot so first paint matches geo language (avoids EN flash). */
function bootFromWindow(): Partial<LocaleState> {
  if (typeof window === "undefined") return {};
  return initialLocaleFromCookie(window.__CA_LOC);
}

const boot = bootFromWindow();

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      country: boot.country ?? null,
      locale: boot.locale ?? "en-GH",
      language: boot.language ?? "en",
      currency: boot.currency ?? "GHS",
      rates: boot.rates ?? { GHS: 1 },
      nonAfricaMarkupEnabled: false,
      nonAfricaMarkupUsd: 10,
      userOverrideLang: false,
      userOverrideCurrency: false,
      ready: boot.ready ?? false,

      applyDetected: (next) => {
        const current = get();
        const language = current.userOverrideLang ? current.language : next.language;
        const currency = current.userOverrideCurrency ? current.currency : next.currency;
        const locale = current.userOverrideLang
          ? localeForCountry(next.country, language)
          : next.locale;
        const merged = {
          country: next.country,
          locale,
          language,
          currency,
          ready: true,
        };
        set(merged);
        persistPrefs({ ...get(), ...merged });
      },

      setRates: (rates) => {
        const next = { GHS: 1, ...rates };
        set({ rates: next });
        persistPrefs({ ...get(), rates: next });
      },

      setStorePricing: (config) => {
        set({
          nonAfricaMarkupEnabled: config.nonAfricaMarkupEnabled,
          nonAfricaMarkupUsd: Number(config.nonAfricaMarkupUsd) || 10,
        });
      },

      setLanguage: (language) => {
        const country = get().country;
        const locale = localeForCountry(country, language);
        set({ language, locale, userOverrideLang: true });
        persistPrefs({ ...get(), language, locale });
      },

      setCurrency: (currency) => {
        const code = currency.toUpperCase();
        set({ currency: code, userOverrideCurrency: true });
        persistPrefs({ ...get(), currency: code });
      },

      applyCheckoutRegion: (next) => {
        const language = get().language;
        const country = next.country
          ? String(next.country).trim().toUpperCase()
          : null;
        const currency = String(next.currency || "USD").trim().toUpperCase();
        const locale = localeForCountry(country, language);
        set({
          country,
          currency,
          locale,
          userOverrideCurrency: true,
          ready: true,
        });
        persistPrefs({ ...get(), country, currency, locale });
      },
    }),
    {
      name: "cosyaura-locale",
      version: 1,
      partialize: (state) => ({
        country: state.country,
        locale: state.locale,
        language: state.language,
        currency: state.currency,
        rates: state.rates,
        nonAfricaMarkupEnabled: state.nonAfricaMarkupEnabled,
        nonAfricaMarkupUsd: state.nonAfricaMarkupUsd,
        userOverrideLang: state.userOverrideLang,
        userOverrideCurrency: state.userOverrideCurrency,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.ready = true;
        setMoneyDisplay({ locale: state.locale, rates: state.rates });
        useCartStore.getState().setCurrency(state.currency);
        if (typeof document !== "undefined") {
          document.documentElement.lang = state.locale || state.language;
        }
        persistPrefs(state);
      },
    }
  )
);

export function useUiLanguage(): UiLang {
  const ssrLanguage = useContext(LocaleSsrContext);
  const hydrated = useContext(LocaleHydratedContext);
  const storeLanguage = useLocaleStore((s) => s.language);
  return hydrated ? storeLanguage : ssrLanguage;
}

export function useT() {
  const language = useUiLanguage();
  return (key: string, vars?: Record<string, string | number>) =>
    translate(language, key, vars);
}
