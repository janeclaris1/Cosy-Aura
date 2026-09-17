"use client";

import { CEMAC_COUNTRIES } from "@/lib/flutterwave";
import {
  checkoutLabelClass,
  checkoutSelectClass,
} from "@/components/checkout/checkout-ui";

/** Curated checkout countries — form selection overrides silent IP geo. */
export const CHECKOUT_COUNTRY_OPTIONS = [
  { code: "GH", name: "Ghana" },
  { code: "NG", name: "Nigeria" },
  ...CEMAC_COUNTRIES,
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "ZA", name: "South Africa" },
  { code: "KE", name: "Kenya" },
  { code: "AU", name: "Australia" },
] as const;

export function CheckoutCountrySelect({
  value,
  onChange,
  label = "Country / region",
}: {
  value: string;
  onChange: (code: string) => void;
  label?: string;
}) {
  const selected = value || "US";

  return (
    <label className={checkoutLabelClass}>
      {label}
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className={checkoutSelectClass}
        aria-label={label}
      >
        {CHECKOUT_COUNTRY_OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
