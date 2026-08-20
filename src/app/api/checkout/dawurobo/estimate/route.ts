import { NextResponse } from "next/server";
import {
  dawuroboConfigured,
  dawuroboPartnerPayerEnabled,
  dawuroboPickupConfig,
  estimateDawuroboDelivery,
} from "@/lib/dawurobo";
import { resolveGhanaDeliveryLocation } from "@/lib/ghana-geo";

export async function GET() {
  const pickup = dawuroboPickupConfig();
  return NextResponse.json({
    enabled: dawuroboConfigured() && Boolean(pickup),
    partnerPayerEnabled: dawuroboPartnerPayerEnabled() && Boolean(pickup),
    nextDayOnly: true,
  });
}

export async function POST(req: Request) {
  try {
    if (!dawuroboConfigured() || !dawuroboPickupConfig()) {
      return NextResponse.json(
        { error: "Dawurobo delivery is not configured" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const location = resolveGhanaDeliveryLocation({
      city: body.city,
      address: body.address,
      lat: body.lat != null ? Number(body.lat) : null,
      lng: body.lng != null ? Number(body.lng) : null,
    });

    const estimate = await estimateDawuroboDelivery({
      delivery: location.coordinates,
    });

    const price = Number(estimate.data?.estimated_price);
    if (estimate.status !== "success" || !Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        {
          error:
            estimate.message ||
            "Could not estimate delivery for this address. Try Accra or another supported city.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      amountGhs: price,
      currency: "GHS",
      city: location.city,
      region: location.region,
      coordinates: location.coordinates,
      window: estimate.data?.delivery_window || null,
    });
  } catch (error) {
    console.error("[dawurobo/estimate]", error);
    return NextResponse.json(
      { error: "Delivery estimate failed" },
      { status: 500 }
    );
  }
}
