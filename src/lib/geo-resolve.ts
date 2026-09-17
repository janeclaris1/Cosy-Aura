/** Silent geo hints — no browser permission prompts. */

const TIMEZONE_COUNTRY: Record<string, string> = {
  "Africa/Accra": "GH",
  "Africa/Lagos": "NG",
  "Africa/Douala": "CM",
  "Africa/Libreville": "GA",
  "Africa/Brazzaville": "CG",
  "Africa/Ndjamena": "TD",
  "Africa/Malabo": "GQ",
  "Africa/Bangui": "CF",
};

export function countryFromTimezone(timezone: string | null | undefined): string | null {
  const tz = String(timezone || "").trim();
  if (!tz) return null;
  return TIMEZONE_COUNTRY[tz] || null;
}
