import type { OrderStatus } from "@prisma/client";

export const ORDER_STATUS_STEPS: OrderStatus[] = [
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
];

export function formatOrderRef(orderId: string) {
  return orderId.slice(0, 8).toUpperCase();
}

export function orderStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Pending payment",
    PAID: "Paid",
    PROCESSING: "Preparing",
    SHIPPED: "Shipped",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
    REFUNDED: "Refunded",
  };
  return labels[status] || status;
}

export function orderStatusDescription(status: string) {
  const descriptions: Record<string, string> = {
    PENDING: "Waiting for payment to complete.",
    PAID: "Payment received. Your order is in the queue.",
    PROCESSING: "Your fragrance is being prepared for dispatch.",
    SHIPPED: "Your order is on the way.",
    DELIVERED: "Your order has been delivered.",
    CANCELLED: "This order was cancelled.",
    REFUNDED: "A refund has been processed for this order.",
  };
  return descriptions[status] || "";
}

/** Active step index in the fulfillment timeline, or -1 if cancelled/refunded/pending. */
export function timelineStepIndex(status: OrderStatus): number {
  if (status === "CANCELLED" || status === "REFUNDED" || status === "PENDING") {
    return -1;
  }
  return ORDER_STATUS_STEPS.indexOf(status);
}

export function buildCarrierTrackingUrl(
  carrier: string | null | undefined,
  trackingNumber: string | null | undefined
): string | null {
  if (!trackingNumber) return null;
  const code = trackingNumber.trim();
  const name = (carrier || "").toLowerCase();

  if (name.includes("dhl")) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(code)}`;
  }
  if (name.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(code)}`;
  }
  if (name.includes("ups")) {
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(code)}`;
  }
  if (name.includes("usps")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(code)}`;
  }
  if (name.includes("aramex")) {
    return `https://www.aramex.com/track/results?mode=0&ShipmentNumber=${encodeURIComponent(code)}`;
  }

  return null;
}

export function resolveTrackingUrl(order: {
  trackingUrl?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
}): string | null {
  if (order.trackingUrl?.trim()) return order.trackingUrl.trim();
  return buildCarrierTrackingUrl(order.carrier, order.trackingNumber);
}
