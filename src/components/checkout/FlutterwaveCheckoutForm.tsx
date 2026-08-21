"use client";

import { RegionalCheckoutForm, type RegionalCartItem } from "@/components/checkout/RegionalCheckoutForm";
import { CEMAC_COUNTRIES, cemacCountryName, type CemacCountry } from "@/lib/flutterwave";
import { useT } from "@/lib/locale-store";

export function FlutterwaveCheckoutForm({
  country,
  onCountryChange,
  items,
  subtotal,
}: {
  country: CemacCountry;
  onCountryChange: (code: CemacCountry) => void;
  items: RegionalCartItem[];
  subtotal: number;
}) {
  const t = useT();
  return (
    <RegionalCheckoutForm
      country={country}
      onCountryChange={(code) => onCountryChange(code as CemacCountry)}
      countryOptions={CEMAC_COUNTRIES}
      items={items}
      subtotal={subtotal}
      endpoint="/api/checkout/flutterwave"
      providerLabel="Flutterwave"
      hint={t("checkout.flutterwaveHint", { country: cemacCountryName(country) })}
      phonePlaceholder="6XX XXX XXX"
      submitLabel={t("checkout.continueFlutterwave")}
    />
  );
}
