/** Storefront list prices in GHS before discount. */
export const LIST_30ML_TIERS_GHS = [150, 160] as const;
export const LIST_50ML_GHS = 250;
export const LIST_100ML_TIERS_GHS = [380, 390, 420] as const;

export const STORE_DISCOUNT_PERCENT = 7;

/** Extra discount for signed-in member accounts (email signup). */
export const MEMBER_DISCOUNT_PERCENT = 5;

/** 3ml dab-on sample vial. Quoted to customers at GH₵35. */
export const SAMPLE_SIZE_ML = 3;
export const SAMPLE_LIST_GHS = 35;

export function sampleSalePrice(): number {
  return SAMPLE_LIST_GHS;
}

export function applyMemberDiscount(price: number): number {
  return Math.round(price * (100 - MEMBER_DISCOUNT_PERCENT)) / 100;
}

function priceHash(seed: string): number {
  let hash = 0;
  const key = seed || "cosy-aura";
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickTier<T extends readonly number[]>(seed: string, tiers: T, salt = 0): T[number] {
  return tiers[(priceHash(seed) + salt) % tiers.length];
}

export function listPriceForSize(size: 30 | 50 | 100, seed = ""): number {
  if (size === 30) return pickTier(seed, LIST_30ML_TIERS_GHS, 0);
  if (size === 100) return pickTier(seed, LIST_100ML_TIERS_GHS, 11);
  return LIST_50ML_GHS;
}

export function applyStoreDiscount(listPrice: number): number {
  return Math.round(listPrice * (100 - STORE_DISCOUNT_PERCENT)) / 100;
}

export function salePriceForSize(size: 30 | 50 | 100, seed = ""): number {
  return applyStoreDiscount(listPriceForSize(size, seed));
}
