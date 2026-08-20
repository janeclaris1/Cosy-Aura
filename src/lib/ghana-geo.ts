import type { DawuroboCoords } from "@/lib/dawurobo";

/** Approximate city centres for Ghana delivery estimates when GPS is unavailable. */
const GHANA_CITY_COORDS: Record<string, DawuroboCoords & { region: string }> = {
  accra: { lat: 5.6037, lng: -0.187, region: "Greater Accra" },
  tema: { lat: 5.6698, lng: -0.0166, region: "Greater Accra" },
  madina: { lat: 5.6833, lng: -0.1667, region: "Greater Accra" },
  "east legon": { lat: 5.636, lng: -0.15, region: "Greater Accra" },
  osu: { lat: 5.5608, lng: -0.182, region: "Greater Accra" },
  kantamanto: { lat: 5.55, lng: -0.21, region: "Greater Accra" },
  kumasi: { lat: 6.6885, lng: -1.6244, region: "Ashanti" },
  takoradi: { lat: 4.8845, lng: -1.7554, region: "Western" },
  "cape coast": { lat: 5.1053, lng: -1.2466, region: "Central" },
  tamale: { lat: 9.4034, lng: -0.8424, region: "Northern" },
  sunyani: { lat: 7.3399, lng: -2.3268, region: "Bono" },
  koforidua: { lat: 6.0941, lng: -0.2591, region: "Eastern" },
  ho: { lat: 6.6009, lng: 0.4713, region: "Volta" },
  wa: { lat: 10.0601, lng: -2.5099, region: "Upper West" },
  bolgatanga: { lat: 10.7856, lng: -0.8514, region: "Upper East" },
};

export function resolveGhanaDeliveryLocation(input: {
  city?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
}): { coordinates: DawuroboCoords; region: string; city: string } {
  if (
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng) &&
    input.lat != null &&
    input.lng != null
  ) {
    return {
      coordinates: { lat: Number(input.lat), lng: Number(input.lng) },
      region: "Greater Accra",
      city: String(input.city || "Accra").trim() || "Accra",
    };
  }

  const city = String(input.city || "").trim();
  const haystack = `${city} ${input.address || ""}`.toLowerCase();
  for (const [name, meta] of Object.entries(GHANA_CITY_COORDS)) {
    if (haystack.includes(name)) {
      return {
        coordinates: { lat: meta.lat, lng: meta.lng },
        region: meta.region,
        city: city || name.replace(/\b\w/g, (c) => c.toUpperCase()),
      };
    }
  }

  const fallback = GHANA_CITY_COORDS.accra;
  return {
    coordinates: { lat: fallback.lat, lng: fallback.lng },
    region: fallback.region,
    city: city || "Accra",
  };
}
