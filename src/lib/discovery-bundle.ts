import { SAMPLE_SIZE_ML, sampleSalePrice } from "@/lib/pricing";

/** Extra % off when the cart has this many 2ml samples (or more). */
export const DISCOVERY_BUNDLE_MIN_SAMPLES = 4;
export const DISCOVERY_BUNDLE_DISCOUNT = 0.15;

export function isSampleLine(item: {
  bottleSize?: number;
  model?: string;
}): boolean {
  if (item.bottleSize === SAMPLE_SIZE_ML) return true;
  return Boolean(item.model?.toLowerCase().includes("sample"));
}

export function sampleLineUnitPrice(): number {
  return sampleSalePrice();
}

/** Apply discovery-set bundle discount across sample lines in a priced cart. */
export function applyDiscoveryBundleDiscount<
  T extends { bottleSize?: number; model?: string; quantity: number; price: number },
>(items: T[]): T[] {
  const sampleQty = items.reduce(
    (sum, item) => (isSampleLine(item) ? sum + Number(item.quantity) : sum),
    0
  );

  if (sampleQty < DISCOVERY_BUNDLE_MIN_SAMPLES) return items;

  return items.map((item) => {
    if (!isSampleLine(item)) return item;
    return {
      ...item,
      price:
        Math.round(Number(item.price) * (1 - DISCOVERY_BUNDLE_DISCOUNT) * 100) /
        100,
    };
  });
}

export const SUBSCRIPTION_PLANS = [
  {
    id: "discovery-3",
    name: "Discovery Trio",
    samples: 3,
    blurb: "Three 2ml samples curated to your scent profile each month.",
  },
  {
    id: "discovery-5",
    name: "Atelier Five",
    samples: 5,
    blurb: "Five samples plus a layering note card from our noses.",
  },
  {
    id: "signature-5",
    name: "Signature Five",
    samples: 5,
    blurb: "Five contrasting trails — then choose a full bottle you love.",
  },
] as const;

export type SubscriptionPlanId = (typeof SUBSCRIPTION_PLANS)[number]["id"];

export function subscriptionPlanPriceGhs(samples: number): number {
  const unit = sampleSalePrice();
  const subtotal = unit * samples;
  if (samples >= DISCOVERY_BUNDLE_MIN_SAMPLES) {
    return Math.round(subtotal * (1 - DISCOVERY_BUNDLE_DISCOUNT) * 100) / 100;
  }
  return Math.round(subtotal * 100) / 100;
}
