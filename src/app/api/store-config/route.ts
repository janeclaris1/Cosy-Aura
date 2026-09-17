import { NextResponse } from "next/server";
import { getStoreConfig } from "@/lib/store-config";

export const dynamic = "force-dynamic";

/** Public storefront config (no secrets). */
export async function GET() {
  const config = await getStoreConfig();
  return NextResponse.json(
    {
      nonAfricaMarkupEnabled: config.nonAfricaMarkupEnabled,
      nonAfricaMarkupUsd: config.nonAfricaMarkupUsd,
      catalogMarkupUsd: config.catalogMarkupUsd,
      guestHiddenPriceCatalogs: config.guestHiddenPriceCatalogs,
    },
    {
      headers: { "Cache-Control": "public, max-age=60" },
    }
  );
}
