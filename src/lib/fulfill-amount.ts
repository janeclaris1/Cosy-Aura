import { fetchRatesFromGhs } from "@/lib/fx";
import { paystackCharge, type PaystackCountry } from "@/lib/paystack";
import { orderItemsSubtotalGhs } from "@/lib/order-money";

type OrderChargeFields = {
  total: number;
  shippingCost: number;
  shippingCountry: string | null;
  dawuroboPayer?: string | null;
  chargeAmount?: number | null;
  chargeCurrency?: string | null;
  items?: { price: number; quantity: number }[];
};

const AMOUNT_TOLERANCE = 0.02;

function closeEnough(a: number, b: number, tolerance = AMOUNT_TOLERANCE): boolean {
  return Math.abs(a - b) <= tolerance;
}

/** GHS amount Paystack should have charged (prepaid full order vs COD delivery-only). */
export function expectedPaystackChargeGhs(order: OrderChargeFields): number {
  const itemsTotal = order.items?.length
    ? orderItemsSubtotalGhs(order.items)
    : Math.max(0, order.total - Number(order.shippingCost ?? 0));
  const shippingGhs = Number(order.shippingCost ?? 0);
  if (order.dawuroboPayer === "cod") {
    return shippingGhs;
  }
  return itemsTotal + shippingGhs;
}

export async function verifyPaystackPaidAmount(
  order: OrderChargeFields,
  paidAmountMinor: number,
  paidCurrency: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const currency = paidCurrency.toUpperCase();
  const country = (order.shippingCountry || "GH").toUpperCase() as PaystackCountry;

  if (order.chargeAmount != null && order.chargeCurrency) {
    const expectedMinor = Math.round(
      order.chargeAmount * (currency === "NGN" || currency === "GHS" ? 100 : 100)
    );
    if (
      order.chargeCurrency.toUpperCase() === currency &&
      Math.abs(paidAmountMinor - expectedMinor) <= 1
    ) {
      return { ok: true };
    }
  }

  const chargeGhs = expectedPaystackChargeGhs(order);
  const { rates } = await fetchRatesFromGhs();
  const expected = paystackCharge(chargeGhs, country, rates);

  if (expected.currency !== currency) {
    return {
      ok: false,
      reason: `Currency mismatch (expected ${expected.currency}, got ${currency})`,
    };
  }

  if (Math.abs(paidAmountMinor - expected.amount) > 1) {
    return {
      ok: false,
      reason: `Amount mismatch (expected ${expected.amount}, got ${paidAmountMinor})`,
    };
  }

  return { ok: true };
}

export function verifyFlutterwavePaidAmount(
  order: OrderChargeFields,
  paidAmount: number,
  paidCurrency: string
): { ok: true } | { ok: false; reason: string } {
  const currency = paidCurrency.toUpperCase();

  if (order.chargeAmount != null && order.chargeCurrency) {
    if (
      order.chargeCurrency.toUpperCase() === currency &&
      closeEnough(paidAmount, order.chargeAmount)
    ) {
      return { ok: true };
    }
    return {
      ok: false,
      reason: `Charge mismatch (expected ${order.chargeAmount} ${order.chargeCurrency})`,
    };
  }

  if (closeEnough(paidAmount, order.total)) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: `Amount mismatch (expected ${order.total}, got ${paidAmount})`,
  };
}

export function verifyStripePaidAmount(
  order: OrderChargeFields,
  paidAmountMajor: number | null,
  paidCurrency: string | null,
  usdPerGhs?: number
): { ok: true } | { ok: false; reason: string } {
  if (paidAmountMajor == null || !paidCurrency) {
    return { ok: false, reason: "Missing Stripe charge amount" };
  }

  const currency = paidCurrency.toUpperCase();

  if (order.chargeAmount != null && order.chargeCurrency) {
    if (
      order.chargeCurrency.toUpperCase() === currency &&
      closeEnough(paidAmountMajor, order.chargeAmount)
    ) {
      return { ok: true };
    }
  }

  if (currency === "USD" && usdPerGhs && usdPerGhs > 0) {
    const itemsGhs = order.items?.length
      ? orderItemsSubtotalGhs(order.items)
      : Math.max(0, order.total - Number(order.shippingCost ?? 0));
    const shippingGhs = Number(order.shippingCost ?? 0);
    const expectedUsd =
      Math.round((itemsGhs + shippingGhs) * usdPerGhs * 100) / 100;
    if (closeEnough(paidAmountMajor, expectedUsd, 0.05)) {
      return { ok: true };
    }
    return {
      ok: false,
      reason: `Stripe amount mismatch (expected ~${expectedUsd} USD, got ${paidAmountMajor})`,
    };
  }

  return {
    ok: false,
    reason: `Stripe amount mismatch (paid ${paidAmountMajor} ${currency})`,
  };
}
