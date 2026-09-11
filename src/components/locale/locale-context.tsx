"use client";

import { createContext } from "react";
import type { UiLang } from "@/lib/geo-locale";

/** Language from the server cookie — used until the client hydrates. */
export const LocaleSsrContext = createContext<UiLang>("en");

/** Country from the server cookie — used until the client hydrates. */
export const LocaleSsrCountryContext = createContext<string | null>(null);

/** Currency from the server cookie — used until the client hydrates. */
export const LocaleSsrCurrencyContext = createContext<string>("GHS");

/** FX rates from the server cookie — used until the client hydrates. */
export const LocaleSsrRatesContext = createContext<Record<string, number>>({
  GHS: 1,
});

/** False during SSR and the first client render; true after mount. */
export const LocaleHydratedContext = createContext(false);
