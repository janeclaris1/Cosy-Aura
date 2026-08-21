import { NextResponse } from "next/server";
import { getCountryCommerceConfig } from "@/lib/branches";
import { getStoreConfig } from "@/lib/store-config";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = String(searchParams.get("country") || "")
    .trim()
    .toUpperCase();

  const [store, commerce] = await Promise.all([
    getStoreConfig(),
    getCountryCommerceConfig(country || null),
  ]);

  return NextResponse.json({
    masterEnabled: store.whatsappCheckoutEnabled,
    enabled: Boolean(commerce?.whatsappEnabled),
    country: commerce?.country || country || null,
    phone: commerce?.whatsappPhone || null,
    waMeUrl: commerce?.waMeUrl || null,
    branchName: commerce?.branchName || null,
  });
}
