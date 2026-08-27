import { rateFromGhs } from "@/lib/fx";
import type { LocaleCookie } from "@/lib/locale-cookie";

type MoneyDisplay = {
  locale: string;
  rates: Record<string, number>;
};

let display: MoneyDisplay = {
  locale: "en-GH",
  rates: { GHS: 1 },
};

/**
 * While true, formatPrice reads the cookie snapshot so the first client paint
 * matches SSR — even if zustand persist rehydrates a different locale.
 */
let hydrationLock: MoneyDisplay | null = null;

export function setMoneyDisplay(next: Partial<MoneyDisplay>) {
  if (next.locale) display.locale = next.locale;
  if (next.rates) display.rates = { GHS: 1, ...next.rates };
}

export function getMoneyDisplay(): MoneyDisplay {
  return hydrationLock ?? display;
}

/** Call after LocaleProvider has hydrated so live locale changes apply. */
export function releaseMoneyHydrationLock() {
  hydrationLock = null;
}

export function convertFromGhs(amountGhs: number, currency = "GHS"): number {
  return Number(amountGhs || 0) * rateFromGhs(getMoneyDisplay().rates, currency);
}

export function applyLocaleCookieToMoney(cookie: LocaleCookie | null | undefined) {
  if (!cookie) return;
  setMoneyDisplay({
    locale: cookie.locale,
    rates: {
      GHS: 1,
      [cookie.currency]: cookie.rate > 0 ? cookie.rate : 1,
    },
  });
}

export function bootstrapClientMoneyDisplay() {
  if (typeof window === "undefined") return;
  const snap = window.__CA_LOC;
  if (snap?.currency && snap.locale) {
    applyLocaleCookieToMoney({
      language: snap.language,
      currency: snap.currency,
      locale: snap.locale,
      country: snap.country,
      rate: snap.rate,
    });
  }
  // Freeze formatting to this snapshot until React locale hydration finishes.
  hydrationLock = {
    locale: display.locale,
    rates: { ...display.rates },
  };
}

if (typeof window !== "undefined") {
  bootstrapClientMoneyDisplay();
}

declare global {
  interface Window {
    __CA_LOC?: LocaleCookie;
  }
}
