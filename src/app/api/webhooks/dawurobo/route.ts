import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyDawuroboWebhook } from "@/lib/dawurobo";

function mapDawuroboEventToStatus(
  event: string
): "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | null {
  switch (event) {
    case "order.created":
    case "order.accepted":
      return "PROCESSING";
    case "order.picked_up":
    case "order.in_transit":
    case "order.rescheduled":
      return "SHIPPED";
    case "order.delivered":
      return "DELIVERED";
    case "order.cancelled":
    case "order.rejected":
    case "order.returned":
      return "CANCELLED";
    default:
      return null;
  }
}

export async function POST(req: Request) {
  const raw = await req.text();
  const signature =
    req.headers.get("x-webhook-signature") ||
    req.headers.get("X-Webhook-Signature");

  if (!verifyDawuroboWebhook(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const payload = JSON.parse(raw) as {
      service?: string;
      event?: string;
      data?: {
        order_id?: string;
        order_reference?: string;
        tracking_url?: string;
      };
    };

    if (payload.service && payload.service !== "delivery") {
      return NextResponse.json({ received: true });
    }

    const event = String(payload.event || "");
    const dawuroboOrderId = payload.data?.order_id;
    const orderReference = payload.data?.order_reference;
    if (!dawuroboOrderId && !orderReference) {
      return NextResponse.json({ received: true });
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          dawuroboOrderId ? { dawuroboOrderId } : undefined,
          orderReference ? { id: orderReference } : undefined,
        ].filter(Boolean) as Array<{ dawuroboOrderId: string } | { id: string }>,
      },
    });

    if (!order) {
      return NextResponse.json({ received: true, matched: false });
    }

    const nextStatus = mapDawuroboEventToStatus(event);
    const data: {
      status?: "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
      dawuroboOrderId?: string;
      trackingUrl?: string | null;
      carrier?: string;
      shippedAt?: Date;
    } = {
      carrier: "Dawurobo",
    };
    if (dawuroboOrderId) data.dawuroboOrderId = dawuroboOrderId;
    if (payload.data?.tracking_url) data.trackingUrl = payload.data.tracking_url;
    if (nextStatus) {
      // Don't regress a delivered order
      if (!(order.status === "DELIVERED" && nextStatus !== "DELIVERED")) {
        data.status = nextStatus;
      }
      if (nextStatus === "SHIPPED" && !order.shippedAt) {
        data.shippedAt = new Date();
      }
    }

    await prisma.order.update({
      where: { id: order.id },
      data,
    });

    return NextResponse.json({ received: true, orderId: order.id });
  } catch (error) {
    console.error("[webhooks/dawurobo]", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
