import { NextResponse } from "next/server";
import {
  fetchLiveShippingRates,
  type ShippingAddressInput,
} from "@/lib/shipping";
import { usesAramexShipping } from "@/lib/shipping-method-utils";
import {
  getActiveShippingMethods,
  shippingDisplayName,
} from "@/lib/shipping-methods";
import { checkPublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";

export const dynamic = "force-dynamic";

function parseDestination(body: Record<string, unknown>): ShippingAddressInput | null {
  const street1 = String(body.address || body.street1 || "").trim();
  const city = String(body.city || "").trim();
  const country = String(body.country || "").trim().toUpperCase();
  const zip = String(body.postcode || body.zip || "").trim();

  if (!street1 || !city || !country) return null;

  return {
    name: String(body.name || "Customer").trim(),
    street1,
    street2: body.street2 ? String(body.street2).trim() : undefined,
    city,
    state: body.state ? String(body.state).trim() : undefined,
    zip: zip || "00000",
    country,
    phone: body.phone ? String(body.phone).trim() : undefined,
    email: body.email ? String(body.email).trim() : undefined,
  };
}

/** Legacy flat rates — Ghana domestic fallback only. */
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
        carrierId: "store",
      })),
      source: "store",
    });
  } catch (error) {
    console.error("[api/shipping/rates]", error);
    return NextResponse.json({ error: "Failed to fetch shipping rates" }, { status: 500 });
  }
}

/** Live Aramex quotes for international destinations. */
export async function POST(req: Request) {
  if (await checkPublicRateLimit(req, "shipping-rates", 15)) {
    return rateLimitResponse();
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const country = String(body.country || "").trim().toUpperCase();

    if (!usesAramexShipping(country)) {
      const methods = await getActiveShippingMethods();
      return NextResponse.json({
        rates: methods.map((method) => ({
          id: method.id,
          name: method.name,
          description: method.description || shippingDisplayName(method),
          price: method.price,
          currency: "USD",
          eta: method.eta,
          deliveryDays: method.deliveryDaysMax,
          carrierId: "store",
        })),
        source: "store",
      });
    }

    const destination = parseDestination(body);
    if (!destination) {
      return NextResponse.json(
        { error: "Address, city, and country are required for Aramex quotes." },
        { status: 400 }
      );
    }

    const result = await fetchLiveShippingRates(destination);
    return NextResponse.json({
      rates: result.rates,
      source: result.source,
      carrier: "aramex",
      ...(result.error ? { warning: result.error } : {}),
    });
  } catch (error) {
    console.error("[api/shipping/rates]", error);
    return NextResponse.json({ error: "Failed to fetch shipping rates" }, { status: 500 });
  }
}
