import { isCemacCountry, type CemacCountry } from "@/lib/flutterwave";

export type PaymentDestination = "GH" | "NG" | "CEMAC" | "OTHER";

export type GeoPaymentRoute = {
  country: string | null;
  destination: PaymentDestination;
  cemacCountry?: CemacCountry;
  provider: "paystack" | "flutterwave" | "stripe";
  label: string;
};

const COUNTRY_NAMES: Record<string, string> = {
  GH: "Ghana",
  NG: "Nigeria",
  CM: "Cameroon",
  GA: "Gabon",
  CG: "Republic of the Congo",
  TD: "Chad",
  GQ: "Equatorial Guinea",
  CF: "Central African Republic",
};

export function paymentRouteFromCountry(
  code: string | null | undefined
): GeoPaymentRoute {
  const country = String(code || "").trim().toUpperCase();
  if (!country || country === "XX" || country === "T1") {
    return {
      country: null,
      destination: "OTHER",
      provider: "stripe",
      label: "location unknown",
    };
  }

  if (country === "GH" || country === "NG") {
    return {
      country,
      destination: country,
      provider: "paystack",
      label: COUNTRY_NAMES[country] || country,
    };
  }

  if (isCemacCountry(country)) {
    return {
      country,
      destination: "CEMAC",
      cemacCountry: country,
      provider: "flutterwave",
      label: COUNTRY_NAMES[country] || country,
    };
  }

  return {
    country,
    destination: "OTHER",
    provider: "stripe",
    label: COUNTRY_NAMES[country] || country,
  };
}
