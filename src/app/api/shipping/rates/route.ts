import { NextResponse } from "next/server";
import {
  getActiveShippingMethods,
  shippingDisplayName,
} from "@/lib/shipping-methods";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const methods = await getActiveShippingMethods();
    return NextResponse.json({
      rates: methods.map((method) => ({
        id: method.slug,
        name: method.name,
        description: method.description || shippingDisplayName(method),
        price: method.price,
        currency: "USD",
        eta: method.eta,
        deliveryDays: method.deliveryDaysMax,
      })),
      source: "store",
    });
  } catch (error) {
    console.error("[api/shipping/rates]", error);
    return NextResponse.json({ error: "Failed to fetch shipping rates" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await req.json().catch(() => ({}));
    const methods = await getActiveShippingMethods();
    return NextResponse.json({
      rates: methods.map((method) => ({
        id: method.slug,
        name: method.name,
        description: method.description || shippingDisplayName(method),
        price: method.price,
        currency: "USD",
        eta: method.eta,
        deliveryDays: method.deliveryDaysMax,
      })),
      source: "store",
    });
  } catch (error) {
    console.error("[api/shipping/rates]", error);
    return NextResponse.json({ error: "Failed to fetch shipping rates" }, { status: 500 });
  }
}
