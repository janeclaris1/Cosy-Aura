import { formatPrice } from "@/lib/utils";

/** Catalog and accounting currency for Cosy Aura orders. */
export const BOOK_CURRENCY = "GHS";

export type OrderMoneyFields = {
  total: number;
  chargeAmount?: number | null;
  chargeCurrency?: string | null;
};

/** Sum line items in GHS (catalog prices at time of order). */
export function orderItemsSubtotalGhs(
  items: { price: number; quantity: number }[]
): number {
  return Math.round(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100
  ) / 100;
}

/** What to show customers and admins as the amount paid. */
export function formatOrderPaidAmount(order: OrderMoneyFields): string {
  if (
    order.chargeAmount != null &&
    order.chargeCurrency &&
    order.chargeCurrency.toUpperCase() !== BOOK_CURRENCY
  ) {
    return formatPrice(order.chargeAmount, order.chargeCurrency);
  }
  return formatPrice(order.total, BOOK_CURRENCY);
}

/** Book value in GHS (reports, tax, revenue). */
export function formatOrderBookTotal(order: OrderMoneyFields): string {
  return formatPrice(order.total, BOOK_CURRENCY);
}

/** Admin label when charge currency differs from GHS book total. */
export function formatOrderTotalWithBookHint(order: OrderMoneyFields): string {
  const paid = formatOrderPaidAmount(order);
  const hasForeignCharge =
    order.chargeAmount != null &&
    order.chargeCurrency &&
    order.chargeCurrency.toUpperCase() !== BOOK_CURRENCY;

  if (!hasForeignCharge) return paid;

  return `${paid} (${formatOrderBookTotal(order)} book)`;
}

/** Convert a foreign charge amount to GHS using USD-per-GHS rate from checkout. */
export function foreignToGhs(amount: number, rateFromGhsToForeign: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (!Number.isFinite(rateFromGhsToForeign) || rateFromGhsToForeign <= 0) {
    return Math.round(amount * 100) / 100;
  }
  return Math.round((amount / rateFromGhsToForeign) * 100) / 100;
}
