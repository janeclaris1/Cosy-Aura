import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function mapShaqStatus(
  status: string
): "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | null {
  const normalized = status.toLowerCase().replace(/[\s-]+/g, "_");
  if (["created", "pending", "accepted", "assigned", "picked_up"].includes(normalized)) {
    return "PROCESSING";
  }
  if (["in_transit", "out_for_delivery", "arrived_at_hub"].includes(normalized)) {
    return "SHIPPED";
  }
  if (["delivered", "completed"].includes(normalized)) {
    return "DELIVERED";
  }
  if (["cancelled", "canceled", "returned", "failed"].includes(normalized)) {
    return "CANCELLED";
  }
  return null;
}

export async function POST(req: Request) {
  const secret = process.env.SHAQEXPRESS_WEBHOOK_SECRET;
  if (secret) {
    const header =
      req.headers.get("x-shaq-signature") ||
      req.headers.get("x-webhook-secret") ||
      "";
    if (header !== secret) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  try {
    const payload = (await req.json()) as {
      event?: string;
      data?: {
        partnerRef?: string;
        partner_ref?: string;
        trackingNumber?: string;
        tracking_number?: string;
        status?: string;
        statusDescription?: string;
      };
    };

    const event = String(payload.event || "");
    if (event && event !== "package.status_updated") {
      return NextResponse.json({ received: true });
    }

    const data = payload.data || {};
    const partnerRef = String(data.partnerRef || data.partner_ref || "").trim();
    const trackingNumber = String(
      data.trackingNumber || data.tracking_number || ""
    ).trim();
    const status = String(data.status || "").trim();

    if (!partnerRef && !trackingNumber) {
      return NextResponse.json({ received: true });
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          partnerRef ? { id: partnerRef } : undefined,
          trackingNumber ? { shaqexpressTrackingNumber: trackingNumber } : undefined,
          trackingNumber ? { trackingNumber } : undefined,
        ].filter(Boolean) as Array<
          { id: string } | { shaqexpressTrackingNumber: string } | { trackingNumber: string }
        >,
      },
    });

    if (!order) {
      return NextResponse.json({ received: true, matched: false });
    }

    const nextStatus = mapShaqStatus(status);
    const update: {
      status?: "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
      carrier?: string;
      trackingNumber?: string;
      shaqexpressTrackingNumber?: string;
      shippedAt?: Date;
    } = { carrier: "ShaQ Express" };

    if (trackingNumber) {
      update.trackingNumber = trackingNumber;
      update.shaqexpressTrackingNumber = trackingNumber;
    }
    if (nextStatus) {
      if (!(order.status === "DELIVERED" && nextStatus !== "DELIVERED")) {
        update.status = nextStatus;
      }
      if (nextStatus === "SHIPPED" && !order.shippedAt) {
        update.shippedAt = new Date();
      }
    }

    await prisma.order.update({
      where: { id: order.id },
      data: update,
    });

    return NextResponse.json({ received: true, orderId: order.id });
  } catch (error) {
    console.error("[webhooks/shaqexpress]", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
