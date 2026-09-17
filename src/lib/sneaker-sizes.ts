/** Standard EU sneaker sizes offered on the storefront. */
export const SNEAKER_EU_SIZES = [40, 41, 42, 43, 44, 45] as const;

export type SneakerEuSize = (typeof SNEAKER_EU_SIZES)[number];

export function isSneakerEuSize(n: number): n is SneakerEuSize {
  return (SNEAKER_EU_SIZES as readonly number[]).includes(n);
}

export const SNEAKER_EU_SIZE_RANGE_LABEL = "EU 40–45";
