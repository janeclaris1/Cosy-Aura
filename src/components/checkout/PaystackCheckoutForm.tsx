"use client";

import { RegionalCheckoutForm, type RegionalCartItem } from "@/components/checkout/RegionalCheckoutForm";
import type { PaystackCountry } from "@/lib/paystack";
import { useT } from "@/lib/locale-store";

export function PaystackCheckoutForm({
  country,
  items,
  subtotal,
}: {
  country: PaystackCountry;
  items: RegionalCartItem[];
  subtotal: number;
}) {
  const t = useT();
  const countryLabel = country === "GH" ? "Ghana" : "Nigeria";
  return (
    <RegionalCheckoutForm
      country={country}
      items={items}
      subtotal={subtotal}
      endpoint="/api/checkout/paystack"
      providerLabel="Paystack"
      hint={
        country === "GH"
          ? t("checkout.ghanaHint")
          : t("checkout.nigeriaHint", { country: countryLabel })
      }
      phonePlaceholder={country === "GH" ? "050 000 0000" : "0800 000 0000"}
      submitLabel={t("checkout.continuePaystack")}
    />
  );
}
