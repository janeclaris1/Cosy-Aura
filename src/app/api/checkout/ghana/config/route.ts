import { NextResponse } from "next/server";
import {
  dawuroboAvailable,
  ghanaFreeDeliveryThresholdGhs,
  shaqexpressAccraFeeGhs,
  shaqexpressOutsideAccraFeeGhs,
} from "@/lib/ghana-delivery";
import { dawuroboPartnerPayerEnabled } from "@/lib/dawurobo";
import { getShaqexpressRegions, shaqexpressConfigured } from "@/lib/shaqexpress";
import { getCountryCommerceConfig } from "@/lib/branches";

const FALLBACK_REGIONS = [
  { id: 1, name: "Greater Accra" },
  { id: 15, name: "Ashanti" },
  { id: 16, name: "Western" },
  { id: 17, name: "Eastern" },
  { id: 18, name: "Central" },
  { id: 19, name: "Northern" },
  { id: 20, name: "Volta" },
  { id: 21, name: "Upper East" },
  { id: 22, name: "Upper West" },
  { id: 23, name: "Bono" },
  { id: 24, name: "Bono East" },
  { id: 25, name: "Ahafo" },
  { id: 26, name: "Western North" },
  { id: 27, name: "Oti" },
  { id: 28, name: "Savannah" },
  { id: 29, name: "North East" },
];

export async function GET() {
  const commerce = await getCountryCommerceConfig("GH");
  const dawurobo =
    dawuroboAvailable() && (commerce?.dawuroboEnabled ?? true);
  const shaqApi = shaqexpressConfigured();
  let regions = FALLBACK_REGIONS;

  if (shaqApi) {
    try {
      regions = await getShaqexpressRegions();
    } catch (error) {
      console.error("[ghana/config] regions", error);
    }
  }

  const shaqOffered = commerce?.shaqexpressEnabled ?? true;

  return NextResponse.json({
    enabled: true,
    nextDayOnly: true,
    regions,
    defaultRegion: "Greater Accra",
    partnerPayerEnabled: dawuroboPartnerPayerEnabled() || shaqApi,
    codEnabled: commerce?.codEnabled ?? true,
    pickupEnabled: commerce?.pickupEnabled ?? false,
    pickup: commerce?.pickupEnabled
      ? {
          branchName: commerce.branchName,
          address: commerce.address,
          city: commerce.city,
          phone: commerce.phone,
          openingHours: commerce.openingHours,
          notes: commerce.deliveryNotes,
        }
      : null,
    providers: {
      dawurobo: {
        available: dawurobo,
        name: "Dawurobo",
        coverage: "Greater Accra",
        pricing: "live",
        description: "Live rate based on your address · Greater Accra",
      },
      shaqexpress: {
        available: shaqOffered,
        requiresApi: shaqApi,
        name: "ShaQ Express",
        coverage: "Nationwide",
        pricing: "flat",
        description: `Flat rate · Accra GHS ${shaqexpressAccraFeeGhs()} · Outside Accra GHS ${shaqexpressOutsideAccraFeeGhs()}`,
      },
    },
    deliveryFees: {
      accraGhs: shaqexpressAccraFeeGhs(),
      outsideAccraGhs: shaqexpressOutsideAccraFeeGhs(),
    },
    freeDeliveryThresholdGhs: ghanaFreeDeliveryThresholdGhs(),
  });
}
