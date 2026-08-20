import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/lib/fulfill-order";
import { fulfillPaystackReference } from "@/lib/fulfill-paystack";
import { fulfillFlutterwavePayment } from "@/lib/fulfill-flutterwave";

/**
 * Backup to webhooks: verify Stripe, Paystack, or Flutterwave after redirect.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId = String(body.sessionId || "").trim();
    const provider = String(body.provider || "").trim().toLowerCase();
    const transactionId = String(body.transactionId || "").trim();
    const reference = String(
      body.txRef || body.tx_ref || body.reference || body.paystackReference || ""
    ).trim();

    const isFlutterwave =
      provider === "flutterwave" ||
      Boolean(transactionId) ||
      reference.startsWith("flw_");

    if (isFlutterwave && (reference || transactionId)) {
      const result = await fulfillFlutterwavePayment({
        txRef: reference || undefined,
        transactionId: transactionId || undefined,
      });
      return NextResponse.json(result);
    }

    if (reference && !sessionId.startsWith("cs_")) {
      const result = await fulfillPaystackReference(reference);
      return NextResponse.json(result);
    }

    if (!sessionId.startsWith("cs_")) {
      return NextResponse.json({ error: "Invalid session or reference" }, { status: 400 });
    }

    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["shipping_cost.shipping_rate", "payment_intent"],
    });

    const result = await fulfillCheckoutSession(session);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[checkout/fulfill]", error);
    const message =
      error instanceof Error ? error.message : "Fulfillment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
