import { NextResponse } from "next/server";
import { resolveContactWhatsApp } from "@/lib/contact-whatsapp";
import { getStoreConfig } from "@/lib/store-config";

/** Public contact WhatsApp for the header — not gated on checkout WhatsApp. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = String(searchParams.get("country") || "")
    .trim()
    .toUpperCase();

  const store = await getStoreConfig();
  const contact = resolveContactWhatsApp(
    country || null,
    store.whatsappCheckoutNumbers
  );

  return NextResponse.json(contact);
}
