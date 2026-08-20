export const COOKIE_CONSENT_STORAGE_KEY = "cosy-aura-cookie-consent";

export type CookiePrefs = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
};

export type ConsentRecord = {
  choice: "accepted" | "rejected" | "custom";
  prefs: CookiePrefs;
  updatedAt: string;
};

export function readConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentRecord;
  } catch {
    return null;
  }
}
