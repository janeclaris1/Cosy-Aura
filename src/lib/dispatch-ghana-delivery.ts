import { prisma } from "@/lib/prisma";
import type { GhanaDeliveryProvider } from "@/lib/ghana-delivery";
import { dispatchDawuroboForOrder } from "@/lib/dispatch-dawurobo";
import { dispatchShaqexpressForOrder } from "@/lib/dispatch-shaqexpress";

/** Route a paid Ghana order to Dawurobo (Accra) or ShaQ Express (nationwide). */
export async function dispatchGhanaForOrder(orderId: string): Promise<{
  ok: boolean;
  reason?: string;
  provider?: GhanaDeliveryProvider;
}> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { shippingCountry: true, deliveryProvider: true },
  });
  if (!order) return { ok: false, reason: "Order not found" };
  if (order.shippingCountry !== "GH") {
    return { ok: false, reason: "Not a Ghana order" };
  }

  const provider = (order.deliveryProvider as GhanaDeliveryProvider) || null;
  if (provider === "shaqexpress") {
    const result = await dispatchShaqexpressForOrder(orderId);
    return { ...result, provider: "shaqexpress" };
  }

  const result = await dispatchDawuroboForOrder(orderId);
  return { ...result, provider: "dawurobo" };
}
