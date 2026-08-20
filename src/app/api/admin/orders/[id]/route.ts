import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { notifyOrderStatusChange } from "@/lib/notifications";
import { resolveTrackingUrl } from "@/lib/order-tracking";
import type { OrderStatus, Prisma } from "@prisma/client";

const VALID_STATUSES: OrderStatus[] = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const contentType = req.headers.get("content-type") || "";
  let body: Record<string, unknown> = {};

  if (contentType.includes("application/json")) {
    body = await req.json();
  } else {
    const formData = await req.formData();
    body = {
      status: formData.get("status"),
      trackingNumber: formData.get("trackingNumber"),
      trackingUrl: formData.get("trackingUrl"),
      carrier: formData.get("carrier"),
      markShipped: formData.get("markShipped") === "true",
    };
  }

  const existing = await prisma.order.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const hasTrackingUpdate =
    body.trackingNumber !== undefined ||
    body.trackingUrl !== undefined ||
    body.carrier !== undefined ||
    body.markShipped === true;

  const data: Prisma.OrderUpdateInput = {};

  if (typeof body.status === "string" && body.status) {
    if (!VALID_STATUSES.includes(body.status as OrderStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status as OrderStatus;
  }

  if (hasTrackingUpdate) {
    if (body.trackingNumber !== undefined) {
      data.trackingNumber =
        String(body.trackingNumber || "").trim() || null;
    }
    if (body.trackingUrl !== undefined) {
      data.trackingUrl = String(body.trackingUrl || "").trim() || null;
    }
    if (body.carrier !== undefined) {
      data.carrier = String(body.carrier || "").trim() || null;
    }

    const nextTrackingNumber =
      data.trackingNumber !== undefined
        ? (data.trackingNumber as string | null)
        : existing.trackingNumber;
    const nextCarrier =
      data.carrier !== undefined
        ? (data.carrier as string | null)
        : existing.carrier;
    const nextTrackingUrl =
      data.trackingUrl !== undefined
        ? (data.trackingUrl as string | null)
        : existing.trackingUrl;

    // Auto-fill carrier URL when missing
    if (!nextTrackingUrl && nextTrackingNumber) {
      data.trackingUrl = resolveTrackingUrl({
        trackingUrl: null,
        carrier: nextCarrier,
        trackingNumber: nextTrackingNumber,
      });
    }

    if (body.markShipped === true) {
      data.status = "SHIPPED";
    }
  }

  const nextStatus = (data.status as OrderStatus | undefined) || existing.status;
  if (nextStatus === "SHIPPED" && !existing.shippedAt) {
    data.shippedAt = new Date();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data,
  });

  if (existing.status !== updated.status) {
    await notifyOrderStatusChange(updated.id, updated.status);
  }

  return NextResponse.json(updated);
}
