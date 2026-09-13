import { formatPrice } from "@/lib/utils";

/** Catalog and accounting currency for Cosy Aura orders. */
export const BOOK_CURRENCY = "GHS";

export type OrderMoneyFields = {
  total: number;
  chargeAmount?: number | null;
  chargeCurrency?: string | null;
};

export type OrderBookTotalInput = OrderMoneyFields & {
  shippingCost?: number | null;
  posDiscountAmount?: number | null;
  items?: { price: number; quantity: number }[];
};

/** Authoritative GHS book total — prefers line items when stored total is stale. */
export function resolveOrderBookTotalGhs(order: OrderBookTotalInput): number {
  if (!order.items?.length) {
    return order.total;
  }

  let computed =
    orderItemsSubtotalGhs(order.items) -
    Number(order.posDiscountAmount ?? 0) +
    Number(order.shippingCost ?? 0);
  computed = Math.round(computed * 100) / 100;
  computed = Math.max(0, computed);

  const foreignCurrency = order.chargeCurrency?.toUpperCase();
  const hasForeignCharge =
    order.chargeAmount != null &&
    foreignCurrency &&
    foreignCurrency !== BOOK_CURRENCY;

  // Legacy Stripe rows saved USD charge into `total`.
  if (
    hasForeignCharge &&
    Math.abs(order.total - Number(order.chargeAmount)) < 0.02
  ) {
    return computed;
  }

  if (Math.abs(computed - order.total) > 0.02) {
    return computed;
  }

  return order.total;
}

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
  return formatPrice(resolveOrderBookTotalGhs(order), BOOK_CURRENCY);
}

/** Book value in GHS (reports, tax, revenue). */
export function formatOrderBookTotal(order: OrderBookTotalInput): string {
  return formatPrice(resolveOrderBookTotalGhs(order), BOOK_CURRENCY);
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
