import { NextResponse } from "next/server";
import { getStorePricingConfig } from "@/lib/store-config";

export const dynamic = "force-dynamic";

/** Public storefront pricing config (no secrets). */
export async function GET() {
  const config = await getStorePricingConfig();
  return NextResponse.json(config, {
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
