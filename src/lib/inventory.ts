import { prisma } from "@/lib/prisma";
import { syncCountryPoolFromBranches } from "@/lib/branches";
import type { ManagedStockCountry } from "@/lib/country-stock";
import { stockCountryForShopper } from "@/lib/country-stock";
import { BOTTLE_SIZES, isBottleSize, type BottleSize } from "@/lib/bottle-sizes";

function sizeForItem(bottleSize: number | null | undefined): BottleSize | null {
  const n = Number(bottleSize);
  if (isBottleSize(n)) return n;
  // Samples / unknown sizes are not tracked per branch variation.
  return null;
}

/**
 * Commit inventory for a fulfilled order against its fulfilment branch
 * and refresh the country online pool. Idempotent via inventoryCommittedAt.
 */
export async function commitOrderInventory(orderId: string): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      fulfillmentBranch: { select: { id: true, country: true } },
    },
  });
  if (!order) return { ok: false, reason: "Order not found" };
  if (order.inventoryCommittedAt) return { ok: true, reason: "Already committed" };
  if (!order.fulfillmentBranchId || !order.fulfillmentBranch) {
    return { ok: false, reason: "No fulfilment branch" };
  }

  const branchId = order.fulfillmentBranchId;
  const country = order.fulfillmentBranch.country as ManagedStockCountry;

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      const bottleSize = sizeForItem(item.bottleSize);
      if (!bottleSize) continue;
      const existing = await tx.branchStock.findUnique({
        where: {
          branchId_fragranceId_bottleSize: {
            branchId,
            fragranceId: item.fragranceId,
            bottleSize,
          },
        },
      });
      const nextQty = Math.max(0, Number(existing?.quantity || 0) - item.quantity);
      if (existing) {
        await tx.branchStock.update({
          where: { id: existing.id },
          data: { quantity: nextQty },
        });
      } else {
        await tx.branchStock.create({
          data: {
            branchId,
            fragranceId: item.fragranceId,
            bottleSize,
            quantity: 0,
          },
        });
      }
    }

    await tx.order.update({
      where: { id: orderId },
      data: { inventoryCommittedAt: new Date() },
    });
  });

  const fragranceIds = [...new Set(order.items.map((i) => i.fragranceId))];
  for (const fragranceId of fragranceIds) {
    await syncCountryPoolFromBranches(fragranceId, country);
  }

  return { ok: true };
}

/** Restore inventory if an order is cancelled/refunded after commit. */
export async function restoreOrderInventory(orderId: string): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      fulfillmentBranch: { select: { id: true, country: true } },
    },
  });
  if (!order) return { ok: false, reason: "Order not found" };
  if (!order.inventoryCommittedAt) return { ok: true, reason: "Nothing to restore" };
  if (!order.fulfillmentBranchId || !order.fulfillmentBranch) {
    return { ok: false, reason: "No fulfilment branch" };
  }

  const branchId = order.fulfillmentBranchId;
  const country = order.fulfillmentBranch.country as ManagedStockCountry;

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      const bottleSize = sizeForItem(item.bottleSize);
      if (!bottleSize) continue;
      await tx.branchStock.upsert({
        where: {
          branchId_fragranceId_bottleSize: {
            branchId,
            fragranceId: item.fragranceId,
            bottleSize,
          },
        },
        create: {
          branchId,
          fragranceId: item.fragranceId,
          bottleSize,
          quantity: item.quantity,
        },
        update: {
          quantity: { increment: item.quantity },
        },
      });
    }
    await tx.order.update({
      where: { id: orderId },
      data: { inventoryCommittedAt: null },
    });
  });

  const fragranceIds = [...new Set(order.items.map((i) => i.fragranceId))];
  for (const fragranceId of fragranceIds) {
    await syncCountryPoolFromBranches(fragranceId, country);
  }

  return { ok: true };
}

export function countryBucketForOrder(
  shippingCountry: string | null | undefined
): ManagedStockCountry | null {
  return stockCountryForShopper(shippingCountry);
}

export { BOTTLE_SIZES };
