import { NextResponse } from "next/server";
import { getActiveShippingMethods } from "@/lib/shipping-methods";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const methods = await getActiveShippingMethods();
    return NextResponse.json({ methods });
  } catch (error) {
    console.error("[shipping/methods]", error);
    return NextResponse.json(
      { methods: [], error: "Shipping methods unavailable" },
      { status: 503 }
    );
  }
}
