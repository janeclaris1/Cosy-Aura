import { isAfricanCountry } from "@/lib/regional-pricing";

export type ShowroomLocation = {
  cityLabel: string;
  heading: string;
  addressLine: string;
  cityInBody: string;
  mapsUrl: string;
  pickupNote: string;
};

const ACCRA: ShowroomLocation = {
  cityLabel: "Accra",
  heading: "The Showroom",
  addressLine: "15 Odaw Street, Kokomlemle",
  cityInBody: "Accra",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=15+Odaw+Street+Kokomlemle+Accra+Ghana",
  pickupNote:
    "Store pickup also available in Yaoundé and Mamfe — select at checkout.",
};

const YAOUNDE: ShowroomLocation = {
  cityLabel: "Yaoundé",
  heading: "The Showroom",
  addressLine: "Monte Meecham",
  cityInBody: "Yaoundé",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Monte+Meecham+Yaounde+Cameroon",
  pickupNote:
    "Store pickup also available in Accra and Mamfe — select at checkout.",
};

const SHERIDAN: ShowroomLocation = {
  cityLabel: "Sheridan",
  heading: "The Total Shopping Experience",
  addressLine: "30 N Gould St, Sheridan, WY",
  cityInBody: "Sheridan",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=30+N+Gould+St+Sheridan+WY+82801",
  pickupNote: "Worldwide shipping available — select options at checkout.",
};

export function showroomLocationForCountry(
  country: string | null | undefined
): ShowroomLocation {
  const code = String(country || "")
    .trim()
    .toUpperCase();

  if (code === "CM") return YAOUNDE;
  if (code && !isAfricanCountry(code)) return SHERIDAN;
  return ACCRA;
}
