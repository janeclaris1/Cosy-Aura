import { isUiLang, type UiLang } from "@/lib/geo-locale";

export const LOCALE_COOKIE = "ca_loc";

export type LocaleCookie = {
  language: UiLang;
  currency: string;
  locale: string;
  country: string | null;
  rate: number;
};

export function serializeLocaleCookie(value: LocaleCookie): string {
  return [
    value.language,
    value.currency.toUpperCase(),
    value.locale,
    value.country || "",
    String(value.rate > 0 ? value.rate : 1),
  ].join("|");
}

export function parseLocaleCookie(raw?: string | null): LocaleCookie | null {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw.trim());
    const [language, currency, locale, country, rateStr] = decoded.split("|");
    if (!isUiLang(language) || !currency || !locale) return null;
    const rate = Number(rateStr);
    return {
      language,
      currency: currency.toUpperCase(),
      locale,
      country: country || null,
      rate: Number.isFinite(rate) && rate > 0 ? rate : 1,
    };
  } catch {
    return null;
  }
}

export function writeLocaleCookie(value: LocaleCookie) {
  if (typeof document === "undefined") return;
  const encoded = encodeURIComponent(serializeLocaleCookie(value));
  document.cookie = `${LOCALE_COOKIE}=${encoded}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
