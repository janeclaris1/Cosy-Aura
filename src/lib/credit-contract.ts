/** In-store credit sale terms (COSY AURA LTD). */

import { formatPrice } from "@/lib/utils";

export const COMPANY_LEGAL_NAME = "COSY AURA LTD";

export const CREDIT_DOWN_PAYMENT_RATIO = 0.7;
export const CREDIT_BALANCE_RATIO = 0.3;
export const CREDIT_TERM_DAYS = 30;
/** Forfeited from down payment when balance is not paid by due date. */
export const CREDIT_DEFAULT_PENALTY_RATIO = 0.4;
/** Refunded to customer from down payment on default. */
export const CREDIT_DEFAULT_REFUND_RATIO = 0.6;

export function roundCreditGhs(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function computeCreditSplit(totalGhs: number) {
  const total = roundCreditGhs(Math.max(0, totalGhs));
  const downPaymentGhs = roundCreditGhs(total * CREDIT_DOWN_PAYMENT_RATIO);
  const balanceDueGhs = roundCreditGhs(total - downPaymentGhs);
  return { totalGhs: total, downPaymentGhs, balanceDueGhs };
}

export function computeDefaultSettlement(downPaymentGhs: number) {
  const down = roundCreditGhs(downPaymentGhs);
  return {
    penaltyGhs: roundCreditGhs(down * CREDIT_DEFAULT_PENALTY_RATIO),
    refundGhs: roundCreditGhs(down * CREDIT_DEFAULT_REFUND_RATIO),
  };
}

export function creditDueDate(from: Date = new Date()): Date {
  const due = new Date(from);
  due.setUTCDate(due.getUTCDate() + CREDIT_TERM_DAYS);
  return due;
}

export function formatCreditDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function clauseAmount(amountGhs: number): string {
  return formatPrice(amountGhs, "GHS");
}

/** Contract clauses with sale-specific GHS amounts in brackets. */
export function buildCreditContractClauses(input: {
  downPaymentGhs: number;
  balanceDueGhs: number;
}): string[] {
  const { penaltyGhs, refundGhs } = computeDefaultSettlement(input.downPaymentGhs);

  return [
    `Customer pays a minimum 70% (${clauseAmount(input.downPaymentGhs)}) down payment today. The remaining 30% (${clauseAmount(input.balanceDueGhs)}) is due within 30 calendar days.`,
    `Goods are held by ${COMPANY_LEGAL_NAME} until the full purchase price is paid. Goods are released only upon payment completion.`,
    `If the balance is not paid in full by the due date, the agreement is void. ${COMPANY_LEGAL_NAME} retains 40% (${clauseAmount(penaltyGhs)}) of the down payment as a cancellation fee.`,
    `On default, the remaining 60% (${clauseAmount(refundGhs)}) of the down payment is refunded to the customer. Reserved goods return to stock.`,
    `${COMPANY_LEGAL_NAME} may contact the customer by phone, SMS, or WhatsApp regarding this agreement.`,
  ];
}

export function creditContractSummary(totalGhs: number) {
  const { downPaymentGhs, balanceDueGhs } = computeCreditSplit(totalGhs);
  const { penaltyGhs, refundGhs } = computeDefaultSettlement(downPaymentGhs);
  return {
    downPaymentGhs,
    balanceDueGhs,
    termDays: CREDIT_TERM_DAYS,
    penaltyGhs,
    refundGhs,
  };
}
