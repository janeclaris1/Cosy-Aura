import { NextResponse } from "next/server";
import { fulfillFlutterwavePayment } from "@/lib/fulfill-flutterwave";
import { verifyFlutterwaveSignature } from "@/lib/flutterwave";

export async function POST(req: Request) {
  const signature = req.headers.get("verif-hash");
  if (!verifyFlutterwaveSignature(signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const event = (await req.json()) as {
      event?: string;
      data?: { tx_ref?: string; id?: number; status?: string };
    };

    if (
      event.event === "charge.completed" &&
      event.data &&
      ["successful", "completed"].includes(String(event.data.status || "").toLowerCase())
    ) {
      const result = await fulfillFlutterwavePayment({
        txRef: event.data.tx_ref,
        transactionId: event.data.id ? String(event.data.id) : undefined,
      });
      if (!result.ok) {
        console.warn("[flutterwave webhook] fulfill skipped:", result.reason);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[flutterwave webhook]", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 400 });
  }
}
