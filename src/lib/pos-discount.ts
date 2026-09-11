import type { PosDiscountType } from "@prisma/client";

export type PosDiscountInput = {
  type: PosDiscountType;
  value: number;
};

function roundGhs(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function computePosDiscountAmount(
  subtotal: number,
  discount?: PosDiscountInput | null
): number {
  if (!discount || subtotal <= 0 || !Number.isFinite(discount.value) || discount.value <= 0) {
    return 0;
  }

  if (discount.type === "PERCENT") {
    const pct = Math.min(100, Math.max(0, discount.value));
    return roundGhs(subtotal * (pct / 100));
  }

  return Math.min(subtotal, roundGhs(discount.value));
}

export function normalizePosDiscount(
  discount: PosDiscountInput | null | undefined
): PosDiscountInput | null {
  if (!discount || !Number.isFinite(discount.value) || discount.value <= 0) {
    return null;
  }
  if (discount.type !== "PERCENT" && discount.type !== "FIXED") {
    return null;
  }
  return {
    type: discount.type,
    value: roundGhs(discount.value),
  };
}

export function formatPosDiscountLabel(
  type: PosDiscountType,
  value: number
): string {
  if (type === "PERCENT") {
    return `${value % 1 === 0 ? value : value.toFixed(1)}% off`;
  }
  return `GH₵${value.toFixed(2)} off`;
}
