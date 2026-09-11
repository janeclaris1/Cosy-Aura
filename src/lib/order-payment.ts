import type { OrderChannel, PosPaymentMethod } from "@prisma/client";

export type OrderPaymentFields = {
  channel: OrderChannel | string;
  paymentProvider?: string | null;
  posPaymentMethod?: PosPaymentMethod | string | null;
  chargeCurrency?: string | null;
  status?: string;
};

/** Human-readable payment gateway for admin lists and detail views. */
export function paymentGatewayLabel(order: OrderPaymentFields): string {
  if (order.channel === "POS") {
    switch (order.posPaymentMethod) {
      case "CASH":
        return "POS · Cash";
      case "MOMO":
        return "POS · MoMo";
      case "CARD":
        return "POS · Card";
      case "OTHER":
        return "POS · Other";
      default:
        return "POS";
    }
  }

  switch (order.paymentProvider) {
    case "stripe":
      return order.chargeCurrency?.toUpperCase() === "USD"
        ? "Stripe · USD"
        : "Stripe";
    case "paystack":
      return "Paystack";
    case "flutterwave":
      return "Flutterwave";
    case "pos":
      return "POS";
    default:
      if (order.status === "PENDING") return "—";
      return order.paymentProvider
        ? order.paymentProvider.charAt(0).toUpperCase() + order.paymentProvider.slice(1)
        : "—";
  }
}
