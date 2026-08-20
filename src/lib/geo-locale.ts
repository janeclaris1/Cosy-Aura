export type UiLang = "en" | "fr" | "es" | "pt" | "de";

export const UI_LANGUAGES: { code: UiLang; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "fr", label: "French", native: "Français" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "de", label: "German", native: "Deutsch" },
];

export const POPULAR_CURRENCIES = [
  "GHS",
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "XAF",
  "CAD",
  "AUD",
  "AED",
  "ZAR",
  "KES",
  "INR",
  "CHF",
  "JPY",
  "CNY",
] as const;

const EUROZONE = new Set([
  "AT",
  "BE",
  "HR",
  "CY",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PT",
  "SK",
  "SI",
  "ES",
  "AD",
  "MC",
  "SM",
  "VA",
  "ME",
  "XK",
]);

const CEMAC = new Set(["CM", "GA", "CG", "TD", "GQ", "CF"]);

const WAEMU_XOF = new Set(["BJ", "BF", "CI", "GW", "ML", "NE", "SN", "TG"]);

/** ISO 3166-1 alpha-2 → ISO 4217. Unlisted countries fall back to USD. */
const COUNTRY_CURRENCY: Record<string, string> = {
  GH: "GHS",
  NG: "NGN",
  US: "USD",
  PR: "USD",
  GU: "USD",
  VI: "USD",
  AS: "USD",
  MP: "USD",
  GB: "GBP",
  IM: "GBP",
  JE: "GBP",
  GG: "GBP",
  CH: "CHF",
  LI: "CHF",
  CA: "CAD",
  AU: "AUD",
  NZ: "NZD",
  JP: "JPY",
  CN: "CNY",
  HK: "HKD",
  SG: "SGD",
  IN: "INR",
  AE: "AED",
  SA: "SAR",
  QA: "QAR",
  KW: "KWD",
  BH: "BHD",
  OM: "OMR",
  IL: "ILS",
  TR: "TRY",
  ZA: "ZAR",
  KE: "KES",
  UG: "UGX",
  TZ: "TZS",
  RW: "RWF",
  ET: "ETB",
  EG: "EGP",
  MA: "MAD",
  TN: "TND",
  DZ: "DZD",
  BR: "BRL",
  MX: "MXN",
  AR: "ARS",
  CL: "CLP",
  CO: "COP",
  PE: "PEN",
  KR: "KRW",
  TH: "THB",
  VN: "VND",
  ID: "IDR",
  MY: "MYR",
  PH: "PHP",
  PK: "PKR",
  BD: "BDT",
  LK: "LKR",
  NP: "NPR",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  BG: "BGN",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  IS: "ISK",
  RU: "RUB",
  UA: "UAH",
  GE: "GEL",
  AM: "AMD",
  AZ: "AZN",
  KZ: "KZT",
  NA: "NAD",
  BW: "BWP",
  MU: "MUR",
  SC: "SCR",
  ZM: "ZMW",
  MW: "MWK",
  MZ: "MZN",
  AO: "AOA",
  CD: "CDF",
  GN: "GNF",
  SL: "SLL",
  LR: "LRD",
  GM: "GMD",
  MR: "MRU",
  CV: "CVE",
  ST: "STN",
};

const COUNTRY_LANG: Record<string, UiLang> = {
  FR: "fr",
  BE: "fr",
  LU: "fr",
  MC: "fr",
  CH: "fr",
  CM: "fr",
  GA: "fr",
  CG: "fr",
  TD: "fr",
  CF: "fr",
  SN: "fr",
  CI: "fr",
  ML: "fr",
  BF: "fr",
  NE: "fr",
  TG: "fr",
  BJ: "fr",
  GN: "fr",
  CD: "fr",
  MG: "fr",
  HT: "fr",
  MA: "fr",
  DZ: "fr",
  TN: "fr",
  RE: "fr",
  GP: "fr",
  MQ: "fr",
  GF: "fr",
  NC: "fr",
  PF: "fr",
  ES: "es",
  MX: "es",
  AR: "es",
  CO: "es",
  CL: "es",
  PE: "es",
  VE: "es",
  EC: "es",
  GT: "es",
  CU: "es",
  BO: "es",
  DO: "es",
  HN: "es",
  PY: "es",
  SV: "es",
  NI: "es",
  CR: "es",
  PA: "es",
  UY: "es",
  GQ: "es",
  PT: "pt",
  BR: "pt",
  AO: "pt",
  MZ: "pt",
  CV: "pt",
  GW: "pt",
  ST: "pt",
  TL: "pt",
  DE: "de",
  AT: "de",
  LI: "de",
};

export type LocaleProfile = {
  country: string | null;
  currency: string;
  locale: string;
  language: UiLang;
};

export function isUiLang(value: string | null | undefined): value is UiLang {
  return value === "en" || value === "fr" || value === "es" || value === "pt" || value === "de";
}

export function currencyForCountry(code: string | null | undefined): string {
  const country = String(code || "").trim().toUpperCase();
  if (!country) return "USD";
  if (COUNTRY_CURRENCY[country]) return COUNTRY_CURRENCY[country];
  if (EUROZONE.has(country)) return "EUR";
  if (CEMAC.has(country)) return "XAF";
  if (WAEMU_XOF.has(country)) return "XOF";
  return "USD";
}

export function languageForCountry(code: string | null | undefined): UiLang {
  const country = String(code || "").trim().toUpperCase();
  return COUNTRY_LANG[country] || "en";
}

export function localeForCountry(
  code: string | null | undefined,
  language?: UiLang
): string {
  const country = String(code || "").trim().toUpperCase();
  const lang = language || languageForCountry(country);
  if (!country) return lang === "en" ? "en-US" : lang;
  return `${lang}-${country}`;
}

export function localeProfileFromCountry(
  code: string | null | undefined
): LocaleProfile {
  const country = String(code || "").trim().toUpperCase();
  if (!country || country === "XX" || country === "T1") {
    return {
      country: null,
      currency: "USD",
      locale: "en-US",
      language: "en",
    };
  }
  const language = languageForCountry(country);
  return {
    country,
    currency: currencyForCountry(country),
    locale: localeForCountry(country, language),
    language,
  };
}

export function languageFromAcceptLanguage(header: string | null | undefined): UiLang {
  if (!header) return "en";
  const parts = header.split(",").map((part) => part.trim().split(";")[0]?.toLowerCase() || "");
  for (const tag of parts) {
    const base = tag.split("-")[0];
    if (isUiLang(base)) return base;
  }
  return "en";
}

export function chargeCurrencyForDestination(
  destination: "GH" | "NG" | "CEMAC" | "OTHER" | null | undefined
): string {
  if (destination === "NG") return "NGN";
  if (destination === "CEMAC") return "XAF";
  if (destination === "OTHER") return "USD";
  return "GHS";
}
