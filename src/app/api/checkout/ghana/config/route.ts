import { NextResponse } from "next/server";
import {
  dawuroboAvailable,
  shaqexpressAccraFeeGhs,
  shaqexpressOutsideAccraFeeGhs,
} from "@/lib/ghana-delivery";
import { dawuroboPartnerPayerEnabled } from "@/lib/dawurobo";
import { getShaqexpressRegions, shaqexpressConfigured } from "@/lib/shaqexpress";

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
  const dawurobo = dawuroboAvailable();
  const shaqApi = shaqexpressConfigured();
  let regions = FALLBACK_REGIONS;

  if (shaqApi) {
    try {
      regions = await getShaqexpressRegions();
    } catch (error) {
      console.error("[ghana/config] regions", error);
    }
  }

  // ShaQ Express is always offered — flat fee with no API key needed for display.
  // Dawurobo is offered in Accra when its credentials are present.
  const shaqOffered = true;

  return NextResponse.json({
    // Always enabled: ShaQ flat fee works without API credentials
    enabled: true,
    nextDayOnly: true,
    regions,
    defaultRegion: "Greater Accra",
    partnerPayerEnabled: dawuroboPartnerPayerEnabled() || shaqApi,
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
  });
}
