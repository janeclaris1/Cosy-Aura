"use client";

import { useCartStore, type CartItem } from "@/lib/store";
import { useMemberDiscount } from "@/lib/use-member-discount";
import {
  applyDiscoveryBundleDiscount,
  DISCOVERY_BUNDLE_DISCOUNT,
  DISCOVERY_BUNDLE_MIN_SAMPLES,
  isSampleLine,
} from "@/lib/discovery-bundle";

/** Member discount + discovery sample bundle for cart/checkout display. */
export function useCartDisplayPricing(items?: CartItem[]) {
  const storeItems = useCartStore((s) => s.items);
  const cartItems = items ?? storeItems;
  const member = useMemberDiscount();

  const sampleQty = cartItems.reduce(
    (sum, item) => (isSampleLine(item) ? sum + item.quantity : sum),
    0
  );
  const bundleActive = sampleQty >= DISCOVERY_BUNDLE_MIN_SAMPLES;

  const priced = applyDiscoveryBundleDiscount(
    cartItems.map((item) => ({
      ...item,
      price: member.apply(item.price),
    }))
  );

  const subtotal = priced.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const priceFor = (item: CartItem) => {
    const match = priced.find(
      (p) =>
        p.fragranceId === item.fragranceId &&
        (p.bottleSize ?? null) === (item.bottleSize ?? null)
    );
    return match?.price ?? member.apply(item.price);
  };

  return {
    member,
    priced,
    subtotal,
    sampleQty,
    bundleActive,
    bundlePercent: Math.round(DISCOVERY_BUNDLE_DISCOUNT * 100),
    priceFor,
  };
}
