import { NextResponse } from "next/server";
import { fulfillPaystackReference } from "@/lib/fulfill-paystack";
import { verifyPaystackSignature } from "@/lib/paystack";

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyPaystackSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const event = JSON.parse(raw) as {
      event?: string;
      data?: { reference?: string };
    };

    if (event.event === "charge.success" && event.data?.reference) {
      const result = await fulfillPaystackReference(event.data.reference);
      if (!result.ok) {
        console.warn("[paystack webhook] fulfill skipped:", result.reason);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[paystack webhook]", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 400 });
  }
}
