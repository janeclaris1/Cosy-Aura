import { prisma } from "@/lib/prisma";

export type StorePricingConfig = {
  nonAfricaMarkupEnabled: boolean;
  nonAfricaMarkupUsd: number;
};

export type WhatsAppCheckoutNumbers = Record<string, string>;

export type StoreWhatsAppCheckoutConfig = {
  whatsappCheckoutEnabled: boolean;
  whatsappCheckoutNumbers: WhatsAppCheckoutNumbers;
};

export type StoreConfigPayload = StorePricingConfig & StoreWhatsAppCheckoutConfig;

const DEFAULT_MARKUP_USD = Number(process.env.NON_AFRICA_MARKUP_USD) || 10;

export const DEFAULT_STORE_PRICING: StorePricingConfig = {
  nonAfricaMarkupEnabled: false,
  nonAfricaMarkupUsd: DEFAULT_MARKUP_USD,
};

export const DEFAULT_WHATSAPP_CHECKOUT: StoreWhatsAppCheckoutConfig = {
  whatsappCheckoutEnabled: false,
  whatsappCheckoutNumbers: {},
};

export const DEFAULT_STORE_CONFIG: StoreConfigPayload = {
  ...DEFAULT_STORE_PRICING,
  ...DEFAULT_WHATSAPP_CHECKOUT,
};

let cache: { at: number; value: StoreConfigPayload } | null = null;
const CACHE_TTL_MS = 30_000;

export function invalidateStoreConfigCache() {
  cache = null;
}

/** Digits only, suitable for wa.me links. */
export function normalizeWhatsAppPhone(raw: string): string {
  return String(raw || "").replace(/\D/g, "");
}

export function parseWhatsAppCheckoutNumbers(raw: unknown): WhatsAppCheckoutNumbers {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: WhatsAppCheckoutNumbers = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const code = String(key || "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) continue;
    const phone = normalizeWhatsAppPhone(String(value || ""));
    if (phone.length >= 8) out[code] = phone;
  }
  return out;
}

function rowToConfig(row: {
  nonAfricaMarkupEnabled: boolean;
  nonAfricaMarkupUsd: number;
  whatsappCheckoutEnabled?: boolean;
  whatsappCheckoutNumbers?: unknown;
}): StoreConfigPayload {
  return {
    nonAfricaMarkupEnabled: row.nonAfricaMarkupEnabled,
    nonAfricaMarkupUsd: row.nonAfricaMarkupUsd,
    whatsappCheckoutEnabled: Boolean(row.whatsappCheckoutEnabled),
    whatsappCheckoutNumbers: parseWhatsAppCheckoutNumbers(row.whatsappCheckoutNumbers),
  };
}

export async function getStoreConfig(): Promise<StoreConfigPayload> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.value;
  }

  try {
    const row = await prisma.storeConfig.findUnique({ where: { id: "default" } });
    const value = row ? rowToConfig(row) : DEFAULT_STORE_CONFIG;
    cache = { at: Date.now(), value };
    return value;
  } catch {
    return DEFAULT_STORE_CONFIG;
  }
}

/** @deprecated Prefer getStoreConfig — kept for existing pricing callers. */
export async function getStorePricingConfig(): Promise<StorePricingConfig> {
  const full = await getStoreConfig();
  return {
    nonAfricaMarkupEnabled: full.nonAfricaMarkupEnabled,
    nonAfricaMarkupUsd: full.nonAfricaMarkupUsd,
  };
}

export function resolveWhatsAppCheckoutNumber(
  config: StoreWhatsAppCheckoutConfig,
  country: string | null | undefined
): { enabled: boolean; country: string | null; phone: string | null; waMeUrl: string | null } {
  const code = String(country || "")
    .trim()
    .toUpperCase();
  if (!config.whatsappCheckoutEnabled || !/^[A-Z]{2}$/.test(code)) {
    return { enabled: false, country: code || null, phone: null, waMeUrl: null };
  }
  const phone = config.whatsappCheckoutNumbers[code] || null;
  if (!phone) {
    return { enabled: false, country: code, phone: null, waMeUrl: null };
  }
  return {
    enabled: true,
    country: code,
    phone,
    waMeUrl: `https://wa.me/${phone}`,
  };
}

export async function upsertStoreConfig(
  input: Partial<StoreConfigPayload>
): Promise<StoreConfigPayload> {
  if (typeof prisma.storeConfig?.upsert !== "function") {
    throw new Error(
      "StoreConfig model is unavailable. Run `npx prisma generate` and restart the dev server."
    );
  }

  const markupUsd = Number(input.nonAfricaMarkupUsd);
  const numbers =
    input.whatsappCheckoutNumbers !== undefined
      ? parseWhatsAppCheckoutNumbers(input.whatsappCheckoutNumbers)
      : undefined;

  const row = await prisma.storeConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      nonAfricaMarkupEnabled: Boolean(input.nonAfricaMarkupEnabled),
      nonAfricaMarkupUsd:
        Number.isFinite(markupUsd) && markupUsd >= 0 ? markupUsd : DEFAULT_MARKUP_USD,
      whatsappCheckoutEnabled: Boolean(input.whatsappCheckoutEnabled),
      whatsappCheckoutNumbers: numbers ?? {},
    },
    update: {
      ...(input.nonAfricaMarkupEnabled !== undefined
        ? { nonAfricaMarkupEnabled: Boolean(input.nonAfricaMarkupEnabled) }
        : {}),
      ...(Number.isFinite(markupUsd) && markupUsd >= 0
        ? { nonAfricaMarkupUsd: markupUsd }
        : {}),
      ...(input.whatsappCheckoutEnabled !== undefined
        ? { whatsappCheckoutEnabled: Boolean(input.whatsappCheckoutEnabled) }
        : {}),
      ...(numbers !== undefined ? { whatsappCheckoutNumbers: numbers } : {}),
    },
  });

  const value = rowToConfig(row);
  cache = { at: Date.now(), value };
  return value;
}

/** @deprecated Prefer upsertStoreConfig */
export async function upsertStorePricingConfig(
  input: Partial<StorePricingConfig>
): Promise<StorePricingConfig> {
  const full = await upsertStoreConfig(input);
  return {
    nonAfricaMarkupEnabled: full.nonAfricaMarkupEnabled,
    nonAfricaMarkupUsd: full.nonAfricaMarkupUsd,
  };
}

export async function ensureDefaultStoreConfig() {
  // Create the singleton row if missing — never overwrite admin settings.
  await prisma.storeConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      nonAfricaMarkupEnabled: DEFAULT_STORE_CONFIG.nonAfricaMarkupEnabled,
      nonAfricaMarkupUsd: DEFAULT_STORE_CONFIG.nonAfricaMarkupUsd,
      whatsappCheckoutEnabled: DEFAULT_STORE_CONFIG.whatsappCheckoutEnabled,
      whatsappCheckoutNumbers: {},
    },
    update: {},
  });
  invalidateStoreConfigCache();
}
