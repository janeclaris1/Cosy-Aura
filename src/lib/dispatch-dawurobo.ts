import { prisma } from "@/lib/prisma";
import {
  createDawuroboOrder,
  dawuroboConfigured,
  dawuroboPartnerPayerEnabled,
  dawuroboPickupConfig,
  type DawuroboPayer,
} from "@/lib/dawurobo";
import type { GhanaPaymentMode } from "@/lib/ghana-delivery";
import { resolveGhanaDeliveryLocation } from "@/lib/ghana-geo";
import { deliveryDateIso } from "@/lib/delivery-dates";

/**
 * After a Ghana order is paid, book next-day delivery with Dawurobo.
 * Safe to call more than once (order_reference = Cosy Aura order id).
 *
 * Payment modes (stored on dawuroboPayer):
 * - recipient → rider collects delivery fee
 * - partner → Cosy Aura wallet pays delivery
 * - cod → delivery prepaid (partner wallet when available); rider collects product total
 */
export async function dispatchDawuroboForOrder(orderId: string): Promise<{
  ok: boolean;
  reason?: string;
  dawuroboOrderId?: string;
}> {
  if (!dawuroboConfigured() || !dawuroboPickupConfig()) {
    return { ok: false, reason: "Dawurobo not configured" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { fragrance: { include: { brand: true } } } },
    },
  });
  if (!order) return { ok: false, reason: "Order not found" };
  if (order.shippingCountry !== "GH") {
    return { ok: false, reason: "Dawurobo is Ghana-only" };
  }
  if (order.deliveryProvider === "shaqexpress") {
    return { ok: false, reason: "Order uses ShaQ Express" };
  }
  if (order.deliveryProvider === "pickup") {
    return { ok: false, reason: "Order is shop pickup" };
  }
  if (order.dawuroboOrderId) {
    return { ok: true, dawuroboOrderId: order.dawuroboOrderId, reason: "Already dispatched" };
  }

  const mode = (order.dawuroboPayer as GhanaPaymentMode) || "recipient";
  const phone = String(order.shippingPhone || "").trim();
  const name = String(order.shippingName || "").trim();
  if (!phone || !name) {
    return { ok: false, reason: "Missing recipient name or phone" };
  }

  const location = resolveGhanaDeliveryLocation({
    city: order.shippingCity,
    address: order.shippingAddress,
    lat: order.deliveryLat,
    lng: order.deliveryLng,
  });

  const itemSummary =
    order.items
      .map((line) => {
        const label = line.fragrance
          ? `${line.fragrance.brand.name} ${line.fragrance.model}`
          : "Fragrance";
        return `${line.quantity}x ${label}`;
      })
      .join(", ")
      .slice(0, 180) || "COSY AURA fragrance order";

  const dateIso = deliveryDateIso(order.deliveryDate) || undefined;
  if (!dateIso) {
    return { ok: false, reason: "Missing delivery date" };
  }

  const deliveryFee = order.shippingCost || 0;
  const productValue = Math.max(order.total - deliveryFee, 0);

  // Map Cosy Aura payment mode → Dawurobo delivery-fee payer
  let dawuroboPayer: DawuroboPayer;
  if (mode === "recipient") {
    dawuroboPayer = "recipient";
  } else if (mode === "cod" || mode === "partner") {
    dawuroboPayer = dawuroboPartnerPayerEnabled() ? "partner" : "recipient";
  } else {
    return { ok: false, reason: "Invalid delivery payer" };
  }

  const instructions = [
    `Next-day delivery. Cosy Aura order ${order.id.slice(0, 8).toUpperCase()}`,
    mode === "cod"
      ? `COD — delivery fee prepaid online. Collect GHS ${productValue.toFixed(2)} for products only. Do not collect delivery fee.`
      : mode === "partner"
        ? "Fully prepaid — no cash on delivery."
        : "Product prepaid — collect delivery fee only.",
  ].join(" ");

  const created = await createDawuroboOrder({
    orderReference: order.id,
    customerName: name,
    customerPhone: phone,
    deliveryAddress: String(order.shippingAddress || location.city),
    deliveryCity: location.city,
    deliveryRegion: location.region,
    deliveryCoords: location.coordinates,
    item: itemSummary,
    payer: dawuroboPayer,
    deliveryDateIso: dateIso,
    specialInstructions: instructions,
  });

  const dawuroboOrderId = created.data?.order_details?.order_id;
  if (created.status !== "success" || !dawuroboOrderId) {
    if (created.code === "DUPLICATE_ORDER_REFERENCE" || /duplicate/i.test(created.message || "")) {
      return { ok: true, reason: "Duplicate reference (already created)" };
    }
    console.error("[dawurobo] create failed", order.id, created);
    return {
      ok: false,
      reason: created.message || created.code || "Dawurobo create failed",
    };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      dawuroboOrderId,
      carrier: "Dawurobo",
      trackingNumber: dawuroboOrderId,
    },
  });

  return { ok: true, dawuroboOrderId };
}
