import { NextResponse } from "next/server";
import {
  estimateGhanaDelivery,
  ghanaDeliveryConfigured,
  type GhanaDeliveryProvider,
} from "@/lib/ghana-delivery";

export async function POST(req: Request) {
  try {
    if (!ghanaDeliveryConfigured()) {
      return NextResponse.json(
        { error: "Ghana courier delivery is not configured" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const region = String(body.region || body.destinationRegion || "").trim();
    const city = String(body.city || "").trim();
    const preferred = String(body.provider || "").toLowerCase() as GhanaDeliveryProvider | "";

    if (!region) {
      return NextResponse.json({ error: "Select your region" }, { status: 400 });
    }

    if (preferred === "dawurobo" && !city) {
      return NextResponse.json(
        { error: "Enter your city for a live Dawurobo rate" },
        { status: 400 }
      );
    }

    const estimate = await estimateGhanaDelivery({
      region,
      city: city || region,
      address: body.address,
      lat: body.lat != null ? Number(body.lat) : null,
      lng: body.lng != null ? Number(body.lng) : null,
      provider: preferred === "dawurobo" || preferred === "shaqexpress" ? preferred : null,
    });

    return NextResponse.json({
      ...estimate,
      currency: "GHS",
    });
  } catch (error) {
    console.error("[ghana/estimate]", error);
    const message =
      error instanceof Error ? error.message : "Delivery estimate failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
