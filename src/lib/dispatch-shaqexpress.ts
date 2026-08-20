import { prisma } from "@/lib/prisma";
import { deliveryDateIso } from "@/lib/delivery-dates";
import type { GhanaPaymentMode } from "@/lib/ghana-delivery";
import { createShaqexpressPackage, shaqexpressConfigured } from "@/lib/shaqexpress";

/**
 * After a paid Ghana order, book nationwide delivery with ShaQ Express.
 * Safe to call more than once (partner_ref = order id).
 *
 * Payment modes:
 * - recipient: collect delivery fee only (products prepaid)
 * - partner: collect nothing (fully prepaid)
 * - cod: collect product total (delivery fee prepaid online)
 */
export async function dispatchShaqexpressForOrder(orderId: string): Promise<{
  ok: boolean;
  reason?: string;
  trackingNumber?: string;
}> {
  if (!shaqexpressConfigured()) {
    return { ok: false, reason: "ShaQ Express is not configured" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { fragrance: { include: { brand: true } } } },
    },
  });
  if (!order) return { ok: false, reason: "Order not found" };
  if (order.shippingCountry !== "GH") {
    return { ok: false, reason: "ShaQ Express is Ghana-only" };
  }
  if (order.shaqexpressTrackingNumber) {
    return {
      ok: true,
      trackingNumber: order.shaqexpressTrackingNumber,
      reason: "Already dispatched",
    };
  }

  const mode = (order.dawuroboPayer as GhanaPaymentMode) || "recipient";
  const phone = String(order.shippingPhone || "").trim();
  const name = String(order.shippingName || "").trim();
  const region = String(order.shippingRegion || "").trim();
  const city = String(order.shippingCity || "").trim();
  const address = String(order.shippingAddress || "").trim();

  if (!phone || !name || !region || !city || !address) {
    return { ok: false, reason: "Missing delivery details for ShaQ Express" };
  }

  const items = order.items.map((line) => ({
    name: line.fragrance
      ? `${line.fragrance.brand.name} ${line.fragrance.model}`.slice(0, 120)
      : "Fragrance",
    quantity: line.quantity,
  }));

  const description =
    items.map((i) => `${i.quantity}x ${i.name}`).join(", ").slice(0, 180) ||
    "COSY AURA fragrance order";

  const deliveryFee = order.shippingCost || 0;
  const productValue = Math.max(order.total - deliveryFee, 0);
  const amountToCollect =
    mode === "cod" ? productValue : mode === "recipient" ? deliveryFee : 0;

  const dateIso = deliveryDateIso(order.deliveryDate);
  const instructions = [
    dateIso ? `Requested delivery: ${dateIso}` : null,
    `Cosy Aura order ${order.id.slice(0, 8).toUpperCase()}`,
    mode === "cod"
      ? `COD — delivery fee prepaid. Collect GHS ${productValue.toFixed(2)} for products only.`
      : mode === "recipient"
        ? "Product prepaid — collect delivery fee only."
        : "Fully prepaid — no cash on delivery.",
  ]
    .filter(Boolean)
    .join(" · ");

  const created = await createShaqexpressPackage({
    partnerRef: order.id,
    customerName: name,
    customerPhone: phone,
    destinationRegion: region,
    destinationCity: city,
    destinationAddress: address,
    destinationAddressLine2: order.shippingPostcode || undefined,
    regionId: order.shippingRegionId || undefined,
    description,
    valueGhs: Math.max(productValue, 0),
    amountToCollectGhs: Math.max(amountToCollect, 0),
    items,
    specialInstructions: instructions,
  });

  const trackingNumber = created.data?.trackingNumber;
  if (!trackingNumber) {
    if (/duplicate|already/i.test(created.message || "")) {
      return { ok: true, reason: "Duplicate reference (already created)" };
    }
    console.error("[shaqexpress] create failed", order.id, created);
    return {
      ok: false,
      reason: created.message || "ShaQ Express package create failed",
    };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      shaqexpressTrackingNumber: trackingNumber,
      carrier: "ShaQ Express",
      trackingNumber,
    },
  });

  return { ok: true, trackingNumber };
}
