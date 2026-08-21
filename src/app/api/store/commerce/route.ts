import { NextResponse } from "next/server";
import { getCountryCommerceConfig } from "@/lib/branches";

/** Public commerce settings for a shopper country (default branch + WhatsApp). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = String(searchParams.get("country") || "")
    .trim()
    .toUpperCase();

  const config = await getCountryCommerceConfig(country || null);
  if (!config) {
    return NextResponse.json({
      enabled: false,
      country: country || null,
      error: "Unsupported country",
    });
  }

  return NextResponse.json(config);
}
