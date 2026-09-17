import { NextResponse } from "next/server";
import {
  isValidCheckoutEmail,
  normalizeCheckoutEmail,
  sanitizeAbandonmentItems,
  upsertCheckoutAbandonment,
} from "@/lib/checkout-abandonment";
import { checkPublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";

export async function POST(req: Request) {
  if (await checkPublicRateLimit(req, "checkout-abandon", 30)) {
    return rateLimitResponse();
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const email = normalizeCheckoutEmail(String(body.email || ""));
    if (!isValidCheckoutEmail(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const items = sanitizeAbandonmentItems(body.items);
    if (!items) {
      return NextResponse.json({ error: "Invalid cart items" }, { status: 400 });
    }

    const subtotalGhs = Number(body.subtotalGhs);
    if (!Number.isFinite(subtotalGhs) || subtotalGhs < 0) {
      return NextResponse.json({ error: "Invalid subtotal" }, { status: 400 });
    }

    const result = await upsertCheckoutAbandonment({
      email,
      items,
      subtotalGhs,
      displayCurrency: body.displayCurrency ? String(body.displayCurrency) : null,
      shippingCountry: body.shippingCountry ? String(body.shippingCountry) : null,
      customerName: body.customerName ? String(body.customerName) : null,
      customerPhone: body.customerPhone ? String(body.customerPhone) : null,
      checkoutProvider: body.checkoutProvider ? String(body.checkoutProvider) : null,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: result.id });
  } catch (err) {
    console.error("[checkout/abandon]", err);
    return NextResponse.json({ error: "Could not save checkout" }, { status: 500 });
  }
}
