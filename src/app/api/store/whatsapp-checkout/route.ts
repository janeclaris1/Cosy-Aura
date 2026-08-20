import { NextResponse } from "next/server";
import {
  getStoreConfig,
  resolveWhatsAppCheckoutNumber,
} from "@/lib/store-config";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = String(searchParams.get("country") || "")
    .trim()
    .toUpperCase();

  const config = await getStoreConfig();
  const resolved = resolveWhatsAppCheckoutNumber(config, country || null);

  return NextResponse.json({
    masterEnabled: config.whatsappCheckoutEnabled,
    ...resolved,
  });
}
