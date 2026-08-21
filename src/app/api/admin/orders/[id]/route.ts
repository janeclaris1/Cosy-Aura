import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, orderBranchWhere } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { notifyOrderStatusChange } from "@/lib/notifications";
import { resolveTrackingUrl } from "@/lib/order-tracking";
import { commitOrderInventory, restoreOrderInventory } from "@/lib/inventory";
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
  const { ctx, error } = await requireAdminApi("orders.write");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      fulfillmentBranchId: formData.get("fulfillmentBranchId"),
    };
  }

  const scope = orderBranchWhere(ctx);
  const existing = await prisma.order.findFirst({
    where: { id: params.id, ...(scope as object) },
  });
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

  if (body.fulfillmentBranchId !== undefined) {
    if (existing.inventoryCommittedAt) {
      return NextResponse.json(
        {
          error:
            "Stock already committed for this order. Cancel/refund to restore before reassigning.",
        },
        { status: 400 }
      );
    }
    const nextId = body.fulfillmentBranchId
      ? String(body.fulfillmentBranchId).trim()
      : "";
    if (!nextId) {
      data.fulfillmentBranch = { disconnect: true };
    } else {
      const branch = await prisma.branch.findUnique({ where: { id: nextId } });
      if (!branch || !branch.active) {
        return NextResponse.json({ error: "Branch not found" }, { status: 400 });
      }
      const orderCountry = String(existing.shippingCountry || "").toUpperCase();
      if (
        (orderCountry === "GH" || orderCountry === "CM") &&
        branch.country !== orderCountry
      ) {
        return NextResponse.json(
          { error: "Branch must be in the same country as the order." },
          { status: 400 }
        );
      }
      data.fulfillmentBranch = { connect: { id: branch.id } };
    }
  }

  if (hasTrackingUpdate) {
    if (body.trackingNumber !== undefined) {
      data.trackingNumber = String(body.trackingNumber || "").trim() || null;
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

  const becameCommitted =
    ["PENDING", "PAID"].includes(existing.status) &&
    ["PROCESSING", "SHIPPED", "DELIVERED"].includes(updated.status);
  const becameRestored =
    Boolean(existing.inventoryCommittedAt) &&
    ["CANCELLED", "REFUNDED"].includes(updated.status) &&
    !["CANCELLED", "REFUNDED"].includes(existing.status);

  if (becameCommitted) {
    await commitOrderInventory(updated.id);
  } else if (becameRestored) {
    await restoreOrderInventory(updated.id);
  }

  if (existing.status !== updated.status) {
    await notifyOrderStatusChange(updated.id, updated.status);
    await writeAuditLog({
      actorId: ctx.userId,
      action: "order.status",
      entityType: "Order",
      entityId: updated.id,
      summary: `Order ${updated.id.slice(0, 8).toUpperCase()} ${existing.status} → ${updated.status}`,
      metadata: {
        from: existing.status,
        to: updated.status,
        fulfillmentBranchId: updated.fulfillmentBranchId,
      },
    });
  } else if (
    existing.fulfillmentBranchId !== updated.fulfillmentBranchId
  ) {
    await writeAuditLog({
      actorId: ctx.userId,
      action: "order.reassign",
      entityType: "Order",
      entityId: updated.id,
      summary: `Order ${updated.id.slice(0, 8).toUpperCase()} reassigned fulfilment branch`,
      metadata: {
        from: existing.fulfillmentBranchId,
        to: updated.fulfillmentBranchId,
      },
    });
  }

  return NextResponse.json(updated);
}
