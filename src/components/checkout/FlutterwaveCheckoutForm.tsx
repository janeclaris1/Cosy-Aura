"use client";

import { RegionalCheckoutForm, type RegionalCartItem } from "@/components/checkout/RegionalCheckoutForm";
import type { CemacCountry } from "@/lib/flutterwave";
import { useT } from "@/lib/locale-store";

export function FlutterwaveCheckoutForm({
  country,
  items,
  subtotal,
}: {
  country: CemacCountry;
  items: RegionalCartItem[];
  subtotal: number;
}) {
  const t = useT();
  return (
    <RegionalCheckoutForm
      country={country}
      items={items}
      subtotal={subtotal}
      endpoint="/api/checkout/flutterwave"
      providerLabel="Flutterwave"
      hint=""
      phonePlaceholder="6XX XXX XXX"
      submitLabel={t("checkout.continueFlutterwave")}
    />
  );
}
