import {
  dawuroboConfigured,
  dawuroboPartnerPayerEnabled,
  dawuroboPickupConfig,
  estimateDawuroboDelivery,
} from "@/lib/dawurobo";
import { shaqexpressConfigured } from "@/lib/shaqexpress";
import { resolveGhanaDeliveryLocation } from "@/lib/ghana-geo";

export type GhanaDeliveryProvider = "dawurobo" | "shaqexpress";

/** How the Ghana customer settles product vs delivery. */
export type GhanaPaymentMode = "recipient" | "partner" | "cod";

export type GhanaDeliveryPayer = GhanaPaymentMode;

export function isGreaterAccraRegion(region: string | null | undefined): boolean {
  return /greater\s*accra/i.test(String(region || "").trim());
}

export function dawuroboAvailable(): boolean {
  return dawuroboConfigured() && Boolean(dawuroboPickupConfig());
}

/** Ghana-only: product subtotal (GHS) at or above this gets free delivery. */
export const GHANA_FREE_DELIVERY_THRESHOLD_GHS = Number(
  process.env.GHANA_FREE_DELIVERY_THRESHOLD_GHS ?? 1000
);

export function ghanaFreeDeliveryThresholdGhs(): number {
  const n = GHANA_FREE_DELIVERY_THRESHOLD_GHS;
  return Number.isFinite(n) && n > 0 ? n : 1000;
}

export function qualifiesForGhanaFreeDelivery(itemsTotalGhs: number): boolean {
  return itemsTotalGhs >= ghanaFreeDeliveryThresholdGhs();
}

export function applyGhanaFreeDelivery(
  deliveryFeeGhs: number,
  itemsTotalGhs: number
): number {
  if (qualifiesForGhanaFreeDelivery(itemsTotalGhs)) return 0;
  return Math.max(0, deliveryFeeGhs);
}

/** ShaQ is always available as a flat-fee option; no API credentials needed to show it. */
export function shaqexpressAvailable(): boolean {
  return true;
}

/**
 * Providers the customer may choose for a region.
 * Dawurobo: Greater Accra only (live rates) — requires API key + pickup config.
 * ShaQ Express: nationwide flat fee — always available, even without API credentials.
 */
export function availableGhanaProviders(
  region: string | null | undefined
): GhanaDeliveryProvider[] {
  const providers: GhanaDeliveryProvider[] = [];
  const inAccra = isGreaterAccraRegion(region);
  if (inAccra && dawuroboAvailable()) {
    providers.push("dawurobo");
  }
  // ShaQ is always offered nationwide — flat fee needs no credentials
  providers.push("shaqexpress");
  return providers;
}

/** Default pick when the customer has not chosen yet. */
export function resolveGhanaDeliveryProvider(
  region: string | null | undefined,
  preferred?: GhanaDeliveryProvider | null
): GhanaDeliveryProvider | null {
  const available = availableGhanaProviders(region);
  if (!available.length) return null;

  if (preferred && available.includes(preferred)) {
    return preferred;
  }

  // Prefer Dawurobo in Accra when available (live rates), else ShaQ
  if (available.includes("dawurobo")) return "dawurobo";
  return available[0] || null;
}

export function shaqexpressAccraFeeGhs(): number {
  const fee = Number(process.env.SHAQEXPRESS_ACCRA_FEE_GHS);
  return Number.isFinite(fee) && fee >= 0 ? fee : 63;
}

export function shaqexpressOutsideAccraFeeGhs(): number {
  const fee = Number(process.env.SHAQEXPRESS_OUTSIDE_ACCRA_FEE_GHS);
  return Number.isFinite(fee) && fee >= 0 ? fee : 84;
}

/** ShaQ Express rates (GHS): Accra 63 · rest of Ghana 84. */
export function shaqexpressDeliveryFeeGhs(region: string): number {
  const withinAccra = shaqexpressAccraFeeGhs();
  const outsideAccra = shaqexpressOutsideAccraFeeGhs();

  const raw = process.env.SHAQEXPRESS_DELIVERY_FEES_JSON;
  if (raw) {
    try {
      const map = JSON.parse(raw) as Record<string, number>;
      for (const [key, value] of Object.entries(map)) {
        if (key.toLowerCase() === region.toLowerCase() && Number.isFinite(value) && value >= 0) {
          return value;
        }
      }
    } catch {
      // ignore invalid JSON
    }
  }

  return isGreaterAccraRegion(region) ? withinAccra : outsideAccra;
}

/** Customer-facing flat fee by region (ShaQ schedule). */
export function ghanaFlatDeliveryFeeGhs(region: string): number {
  return isGreaterAccraRegion(region)
    ? shaqexpressAccraFeeGhs()
    : shaqexpressOutsideAccraFeeGhs();
}

export async function estimateGhanaDelivery(input: {
  region: string;
  city: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  provider?: GhanaDeliveryProvider | null;
}): Promise<{
  provider: GhanaDeliveryProvider;
  amountGhs: number;
  region: string;
  city: string;
  label: string;
  partnerPayerEnabled: boolean;
  liveRate: boolean;
}> {
  const region = String(input.region || "").trim();
  const city = String(input.city || "").trim();
  const provider = resolveGhanaDeliveryProvider(region, input.provider);

  if (!provider) {
    throw new Error("Delivery is not available for this region yet.");
  }

  if (provider === "dawurobo") {
    if (!isGreaterAccraRegion(region)) {
      throw new Error("Dawurobo only delivers within Greater Accra. Choose ShaQ Express.");
    }
    const location = resolveGhanaDeliveryLocation({
      city,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
    });
    const estimate = await estimateDawuroboDelivery({
      delivery: location.coordinates,
    });
    const price = Number(estimate.data?.estimated_price);
    if (estimate.status !== "success" || !Number.isFinite(price) || price < 0) {
      throw new Error(
        estimate.message || "Could not get a live Dawurobo rate for this address."
      );
    }
    return {
      provider: "dawurobo",
      amountGhs: price,
      region: region || location.region,
      city: location.city,
      label: "Dawurobo",
      partnerPayerEnabled: dawuroboPartnerPayerEnabled(),
      liveRate: true,
    };
  }

  const fee = shaqexpressDeliveryFeeGhs(region);
  return {
    provider: "shaqexpress",
    amountGhs: fee,
    region,
    city: city || region,
    label: "ShaQ Express",
    partnerPayerEnabled: true,
    liveRate: false,
  };
}

/**
 * Ghana delivery is always available — ShaQ Express flat fee works without API
 * credentials (dispatch is manual until SHAQEXPRESS_IDENTIFIER/SECRET are set).
 */
export function ghanaDeliveryConfigured(): boolean {
  return true;
}

export function providerDisplayName(provider: GhanaDeliveryProvider): string {
  return provider === "dawurobo" ? "Dawurobo" : "ShaQ Express";
}
