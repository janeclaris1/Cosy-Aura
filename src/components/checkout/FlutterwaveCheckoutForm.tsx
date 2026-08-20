"use client";

import { RegionalCheckoutForm, type RegionalCartItem } from "@/components/checkout/RegionalCheckoutForm";
import { CEMAC_COUNTRIES, cemacCountryName, type CemacCountry } from "@/lib/flutterwave";

export function FlutterwaveCheckoutForm({
  country,
  onCountryChange,
  items,
  subtotal,
  onBack,
}: {
  country: CemacCountry;
  onCountryChange: (code: CemacCountry) => void;
  items: RegionalCartItem[];
  subtotal: number;
  onBack: () => void;
}) {
  return (
    <RegionalCheckoutForm
      country={country}
      onCountryChange={(code) => onCountryChange(code as CemacCountry)}
      countryOptions={CEMAC_COUNTRIES}
      items={items}
      subtotal={subtotal}
      onBack={onBack}
      endpoint="/api/checkout/flutterwave"
      providerLabel="Flutterwave"
      hint={`Cards and mobile money (Orange / MTN) for CEMAC. Shipping to ${cemacCountryName(country)}. Charged in XAF.`}
      phonePlaceholder="6XX XXX XXX"
      submitLabel="Continue to Flutterwave"
    />
  );
}
