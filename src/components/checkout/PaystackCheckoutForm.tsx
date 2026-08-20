"use client";

import { RegionalCheckoutForm, type RegionalCartItem } from "@/components/checkout/RegionalCheckoutForm";
import type { PaystackCountry } from "@/lib/paystack";

export function PaystackCheckoutForm({
  country,
  items,
  subtotal,
  onBack,
}: {
  country: PaystackCountry;
  items: RegionalCartItem[];
  subtotal: number;
  onBack: () => void;
}) {
  const countryLabel = country === "GH" ? "Ghana" : "Nigeria";
  return (
    <RegionalCheckoutForm
      country={country}
      items={items}
      subtotal={subtotal}
      onBack={onBack}
      endpoint="/api/checkout/paystack"
      providerLabel="Paystack"
      hint={
        country === "GH"
          ? `Cards and mobile money (MTN, Telecel, AirtelTigo). Next-day delivery in Ghana.`
          : `Cards, bank, USSD, and transfer. Shipping to ${countryLabel}.`
      }
      phonePlaceholder={country === "GH" ? "050 000 0000" : "0800 000 0000"}
      submitLabel="Continue to Paystack"
    />
  );
}
