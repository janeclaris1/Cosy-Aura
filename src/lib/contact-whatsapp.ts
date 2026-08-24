function normalizeWhatsAppPhone(raw: string): string {
  return String(raw || "").replace(/\D/g, "");
}

export type ContactWhatsAppKey = "GH" | "CM" | "NG" | "US";

export type ContactWhatsApp = {
  key: ContactWhatsAppKey;
  phone: string;
  display: string;
  waMeUrl: string;
};

function envPhone(name: string, fallback = ""): string {
  return normalizeWhatsAppPhone(process.env[name] || fallback);
}

/** Public header WhatsApp defaults (digits only). Override via NEXT_PUBLIC_WHATSAPP_*. */
export function defaultContactPhones(): Record<ContactWhatsAppKey, string> {
  return {
    GH: envPhone("NEXT_PUBLIC_WHATSAPP_GH", "233500741699"),
    CM: envPhone("NEXT_PUBLIC_WHATSAPP_CM"),
    NG: envPhone("NEXT_PUBLIC_WHATSAPP_NG"),
    US: envPhone("NEXT_PUBLIC_WHATSAPP_US"),
  };
}

export function contactKeyForCountry(
  country: string | null | undefined
): ContactWhatsAppKey {
  const code = String(country || "")
    .trim()
    .toUpperCase();
  if (code === "GH") return "GH";
  if (code === "CM") return "CM";
  if (code === "NG") return "NG";
  return "US";
}

export function formatWhatsAppDisplay(
  phone: string,
  key: ContactWhatsAppKey
): string {
  const digits = normalizeWhatsAppPhone(phone);
  if (key === "GH" && digits.startsWith("233") && digits.length >= 12) {
    return `+233(0) ${digits.slice(3)}`;
  }
  if (key === "NG" && digits.startsWith("234") && digits.length >= 13) {
    const local = `0${digits.slice(3)}`;
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`.trim();
  }
  if (key === "CM" && digits.startsWith("237") && digits.length >= 11) {
    const rest = digits.slice(3);
    return `+237 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5)}`.trim();
  }
  if (key === "US" && digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (key === "US" && digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits ? `+${digits}` : "";
}

/**
 * Pick WhatsApp contact for the shopper's country.
 * GH / CM / NG use that country's number; everyone else gets US.
 * Prefers admin store numbers, then env defaults, then US, then GH.
 */
export function resolveContactWhatsApp(
  country: string | null | undefined,
  storeNumbers?: Record<string, string> | null
): ContactWhatsApp {
  const key = contactKeyForCountry(country);
  const defaults = defaultContactPhones();
  const store = storeNumbers || {};

  const pick = (k: ContactWhatsAppKey) => {
    const fromStore = normalizeWhatsAppPhone(store[k] || "");
    if (fromStore.length >= 8) return fromStore;
    const fromEnv = defaults[k];
    if (fromEnv.length >= 8) return fromEnv;
    return "";
  };

  let phone = pick(key);
  let resolvedKey = key;
  if (!phone && key !== "US") {
    phone = pick("US");
    resolvedKey = "US";
  }
  if (!phone) {
    phone = pick("GH");
    resolvedKey = "GH";
  }

  return {
    key: resolvedKey,
    phone,
    display: formatWhatsAppDisplay(phone, resolvedKey),
    waMeUrl: phone ? `https://wa.me/${phone}` : "https://wa.me/",
  };
}
