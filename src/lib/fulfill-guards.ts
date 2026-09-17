import type { OrderStatus } from "@prisma/client";

export type PaymentProviderId = "stripe" | "paystack" | "flutterwave";

/** Reject fulfillment when the order belongs to a different payment gateway. */
export function rejectWrongPaymentProvider(
  order: { paymentProvider: string | null; status: OrderStatus | string },
  expected: PaymentProviderId
): string | null {
  if (order.paymentProvider && order.paymentProvider !== expected) {
    return `Order is assigned to ${order.paymentProvider}, not ${expected}`;
  }
  return null;
}

/** Prisma filter: order unassigned or already tagged for this provider. */
export function paymentProviderWhere(expected: PaymentProviderId) {
  return {
    OR: [{ paymentProvider: null as string | null }, { paymentProvider: expected }],
  };
}
