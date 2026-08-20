import { NextResponse } from "next/server";
import { getActiveShippingMethods } from "@/lib/shipping-methods";

export async function GET() {
  const methods = await getActiveShippingMethods();
  return NextResponse.json({ methods });
}
