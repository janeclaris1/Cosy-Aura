import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { convertFromGhs, getMoneyDisplay } from "@/lib/money-display";
import type { UiLang } from "@/lib/geo-locale";
import {
  bottleMaterialLabel as bottleMaterialLabelI18n,
  capTypeLabel as capTypeLabelI18n,
  concentrationLabel as concentrationLabelI18n,
  conditionLabel as conditionLabelI18n,
  fragranceFamilyLabel as fragranceFamilyLabelI18n,
  sillageLabel as sillageLabelI18n,
} from "@/lib/i18n-labels";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, currency = "GHS"): string {
  const code = (currency || "GHS").toUpperCase();
  const value = convertFromGhs(Number(price) || 0, code);
  const { locale } = getMoneyDisplay();
  try {
    return new Intl.NumberFormat(locale || "en", {
      style: "currency",
      currency: code,
      currencyDisplay: code === "XAF" || code === "XOF" ? "code" : "narrowSymbol",
    }).format(value);
  } catch {
    return `${code} ${value.toLocaleString(locale || "en", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

/** Map any catalog price into \$299.99-\$499.99 (max under \$500, always ends in .99). */
export function toStorefrontPrice(seed: string): number {
  return toStorefrontPriceInRange(seed, 299, 499);
}

/** Rich gold storefront range helper - kept for seed scripts. */
export function toDaytonaPrice(seed: string): number {
  return toStorefrontPriceInRange(seed, 1149, 1599);
}

/** Mid-luxury storefront range: \$899.99-\$1299.99 (always ends in .99). */
export function toBreitlingPrice(seed: string): number {
  return toStorefrontPriceInRange(seed, 899, 1299);
}

/** Jacob & Co storefront range: \$1499.99-\$2199.99 (always ends in .99). */
export function toJacobCoPrice(seed: string): number {
  return toStorefrontPriceInRange(seed, 1499, 2199);
}

/** Tissot storefront range: \$249.99-\$549.99 (always ends in .99). */
export function toTissotPrice(seed: string): number {
  return toStorefrontPriceInRange(seed, 249, 549);
}

/** Half of a listed retail price, rounded to cents. */
export function toHalfListedPrice(listedPrice: number): number {
  return Math.round(Number(listedPrice) * 50) / 100;
}

/** 70% of a listed retail price, rounded to cents. */
export function toSeventyPercentPrice(listedPrice: number): number {
  return Math.round(Number(listedPrice) * 70) / 100;
}

/** Vacheron Constantin storefront range: \$1599.99-\$2349.99 (always ends in .99). */
export function toVacheronPrice(seed: string): number {
  return toStorefrontPriceInRange(seed, 1599, 2349);
}

/** Alias for special-offer brands priced like the mid-luxury band. */
export function toWatchfinderOfferPrice(seed: string): number {
  return toBreitlingPrice(seed);
}

/** Deterministic .99 price in an inclusive whole-dollar range. */
export function toStorefrontPriceInRange(
  seed: string,
  minDollars: number,
  maxDollars: number
): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const span = Math.max(0, maxDollars - minDollars);
  const dollars = minDollars + (hash % (span + 1));
  return Number((dollars + 0.99).toFixed(2));
}

export function inspiredByBrandLine(brand: string, model?: string): string {
  return model ? `(Inspired by ${brand} ${model})` : `(Inspired by ${brand})`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function conditionLabel(condition: string, lang: UiLang = "en"): string {
  return conditionLabelI18n(condition, lang);
}

export function fragranceFamilyLabel(family: string, lang: UiLang = "en"): string {
  return fragranceFamilyLabelI18n(family, lang);
}

export function bottleMaterialLabel(material: string, lang: UiLang = "en"): string {
  return bottleMaterialLabelI18n(material, lang);
}

export function capTypeLabel(cap: string, lang: UiLang = "en"): string {
  return capTypeLabelI18n(cap, lang);
}

export function concentrationLabel(concentration: string, lang: UiLang = "en"): string {
  return concentrationLabelI18n(concentration, lang);
}

export function sillageLabel(sillage: string, lang: UiLang = "en"): string {
  return sillageLabelI18n(sillage, lang);
}

/** @deprecated Use fragranceFamilyLabel */
export const movementLabel = fragranceFamilyLabel;
/** @deprecated Use bottleMaterialLabel */
export const caseMaterialLabel = bottleMaterialLabel;
/** @deprecated Use capTypeLabel */
export const strapMaterialLabel = capTypeLabel;
