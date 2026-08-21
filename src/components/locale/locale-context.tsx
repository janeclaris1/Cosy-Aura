"use client";

import { createContext } from "react";
import type { UiLang } from "@/lib/geo-locale";

/** Language from the server cookie — used until the client hydrates. */
export const LocaleSsrContext = createContext<UiLang>("en");

/** False during SSR and the first client render; true after mount. */
export const LocaleHydratedContext = createContext(false);
