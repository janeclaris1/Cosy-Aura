import type { PosPaymentMethod, Prisma } from "@prisma/client";
import {
  CREDIT_ACCOUNTS,
  GH_ACCOUNTING_COUNTRY,
  PAYMENT_SOURCE_ACCOUNT,
  SALES_ACCOUNTS,
  type PaymentSource,
} from "@/lib/accounting-gh-coa";
import {
  createPostedJournal,
  ensureGhanaCoa,
  getAccountsByCodes,
  roundLedger,
  type DraftJournalLine,
} from "@/lib/accounting";
import {
  computeDefaultSettlement,
  roundCreditGhs,
} from "@/lib/credit-contract";
import { extractGhanaPosTaxBreakdown } from "@/lib/pos-taxes";
import { orderTaxableAmount, type TaxReportOrder } from "@/lib/tax-reports";
import { prisma } from "@/lib/prisma";
import {
  isGhanaOrder,
  resolveJournalActor,
} from "@/lib/accounting-sales-post";

type TxClient = Prisma.TransactionClient;

function downPaymentSource(method: PosPaymentMethod): PaymentSource {
  if (method === "MOMO") return "MOMO";
  if (method === "CASH") return "CASH";
  return "BANK";
}

function flipJournalLines(
  lines: Array<{ accountId: string; debit: number; credit: number; memo: string | null }>
): DraftJournalLine[] {
  return lines.map((line) => ({
    accountId: line.accountId,
    debit: roundLedger(line.credit),
    credit: roundLedger(line.debit),
    memo: line.memo ? `Reversal · ${line.memo}` : "Reversal",
  }));
}

/** Split sale journal: down payment to cash, balance to AR. */
export async function postCreditSaleJournal(
  client: TxClient,
  orderId: string,
  actorUserId?: string
) {
  await ensureGhanaCoa(client);

  const order = await client.order.findUnique({
    where: { id: orderId },
    include: {
      items: { select: { price: true, quantity: true } },
      creditAgreement: true,
    },
  });

  if (!order?.creditAgreement) {
    throw new Error("Credit agreement not found for order");
  }
  if (!(await isGhanaOrder(client, order))) return null;

  const agreement = order.creditAgreement;
  if (!agreement.downPaymentMethod || !agreement.downPaymentReceivedAt) {
    return null;
  }
  const taxOrder: TaxReportOrder = {
    id: order.id,
    createdAt: order.createdAt,
    status: order.status,
    channel: order.channel,
    total: order.total,
    shippingCost: order.shippingCost,
    posDiscountAmount: order.posDiscountAmount,
    fulfillmentBranchId: order.fulfillmentBranchId,
    shippingCountry: order.shippingCountry,
    items: order.items,
  };

  const productInclusive = orderTaxableAmount(taxOrder);
  const shipping = roundLedger(Math.max(0, Number(order.shippingCost || 0)));
  const cashCollected = roundLedger(productInclusive + shipping);
  if (cashCollected <= 0) return null;

  const taxes = extractGhanaPosTaxBreakdown(productInclusive);
  const paymentCode = PAYMENT_SOURCE_ACCOUNT[downPaymentSource(agreement.downPaymentMethod)];
  const downCollected = roundCreditGhs(agreement.downPaymentGhs);
  const arAmount = roundCreditGhs(agreement.balanceDueGhs);

  const accountCodes = [
    paymentCode,
    CREDIT_ACCOUNTS.receivable,
    SALES_ACCOUNTS.revenue,
    SALES_ACCOUNTS.shipping,
    SALES_ACCOUNTS.vatPayable,
    SALES_ACCOUNTS.nhilPayable,
    SALES_ACCOUNTS.getfundPayable,
  ];
  const accounts = await getAccountsByCodes(client, GH_ACCOUNTING_COUNTRY, accountCodes);
  function acct(code: string) {
    const a = accounts.get(code);
    if (!a) throw new Error(`Missing GL account ${code}`);
    return a;
  }

  const draftLines: DraftJournalLine[] = [
    {
      accountId: acct(paymentCode).id,
      debit: downCollected,
      credit: 0,
      memo: "Credit sale · down payment",
    },
    {
      accountId: acct(CREDIT_ACCOUNTS.receivable).id,
      debit: arAmount,
      credit: 0,
      memo: "Credit sale · balance due",
    },
  ];

  if (taxes.taxable > 0) {
    draftLines.push({
      accountId: acct(SALES_ACCOUNTS.revenue).id,
      debit: 0,
      credit: taxes.taxable,
      memo: "Net product revenue",
    });
  }
  if (taxes.vat > 0) {
    draftLines.push({
      accountId: acct(SALES_ACCOUNTS.vatPayable).id,
      debit: 0,
      credit: taxes.vat,
    });
  }
  if (taxes.nhil > 0) {
    draftLines.push({
      accountId: acct(SALES_ACCOUNTS.nhilPayable).id,
      debit: 0,
      credit: taxes.nhil,
    });
  }
  if (taxes.getfund > 0) {
    draftLines.push({
      accountId: acct(SALES_ACCOUNTS.getfundPayable).id,
      debit: 0,
      credit: taxes.getfund,
    });
  }
  if (shipping > 0) {
    draftLines.push({
      accountId: acct(SALES_ACCOUNTS.shipping).id,
      debit: 0,
      credit: shipping,
    });
  }

  const refSuffix = order.receiptNumber || order.id.slice(-8).toUpperCase();
  return createPostedJournal(client, {
    country: GH_ACCOUNTING_COUNTRY,
    entryDate: order.createdAt,
    reference: `SALE-${refSuffix}`,
    memo: `POS credit sale · down GHS ${downCollected} · AR GHS ${arAmount}`,
    source: "ORDER",
    sourceId: orderId,
    branchId: order.fulfillmentBranchId,
    createdById: await resolveJournalActor(client, order, actorUserId),
    lines: draftLines,
  });
}

export async function postCreditBalancePaymentJournal(
  client: TxClient,
  input: {
    creditPaymentId: string;
    agreementId: string;
    orderId: string;
    amountGhs: number;
    paymentMethod: PosPaymentMethod;
    branchId: string | null;
    actorUserId: string;
    receiptNumber: string | null;
  }
) {
  await ensureGhanaCoa(client);
  const paymentCode =
    PAYMENT_SOURCE_ACCOUNT[
      input.paymentMethod === "MOMO"
        ? "MOMO"
        : input.paymentMethod === "CASH"
          ? "CASH"
          : "BANK"
    ];
  const accounts = await getAccountsByCodes(client, GH_ACCOUNTING_COUNTRY, [
    paymentCode,
    CREDIT_ACCOUNTS.receivable,
  ]);
  const cash = accounts.get(paymentCode);
  const ar = accounts.get(CREDIT_ACCOUNTS.receivable);
  if (!cash || !ar) throw new Error("Missing credit payment accounts");

  const amount = roundCreditGhs(input.amountGhs);
  const refSuffix = input.receiptNumber || input.orderId.slice(-8).toUpperCase();

  return createPostedJournal(client, {
    country: GH_ACCOUNTING_COUNTRY,
    entryDate: new Date(),
    reference: `CRPAY-${refSuffix}-${input.creditPaymentId.slice(-6).toUpperCase()}`,
    memo: `Credit balance payment · GHS ${amount}`,
    source: "CREDIT_PAYMENT",
    sourceId: input.creditPaymentId,
    branchId: input.branchId,
    createdById: input.actorUserId,
    lines: [
      { accountId: cash.id, debit: amount, credit: 0, memo: "Balance collected" },
      { accountId: ar.id, debit: 0, credit: amount, memo: "Clear receivable" },
    ],
  });
}

export async function postCreditDefaultJournal(
  client: TxClient,
  agreementId: string,
  actorUserId: string
) {
  await ensureGhanaCoa(client);

  const agreement = await client.creditAgreement.findUnique({
    where: { id: agreementId },
    include: {
      order: {
        select: {
          id: true,
          receiptNumber: true,
          fulfillmentBranchId: true,
          inventoryCommittedAt: true,
        },
      },
    },
  });
  if (!agreement) throw new Error("Credit agreement not found");

  const { penaltyGhs, refundGhs } = computeDefaultSettlement(agreement.downPaymentGhs);
  const paymentCode =
    PAYMENT_SOURCE_ACCOUNT[downPaymentSource(agreement.downPaymentMethod)];

  const saleJournal = await client.journalEntry.findFirst({
    where: { source: "ORDER", sourceId: agreement.orderId },
    include: { lines: true },
  });
  const cogsJournal = await client.journalEntry.findFirst({
    where: { source: "ORDER_COGS", sourceId: agreement.orderId },
    include: { lines: true },
  });

  const accounts = await getAccountsByCodes(client, GH_ACCOUNTING_COUNTRY, [
    paymentCode,
    CREDIT_ACCOUNTS.penaltyRevenue,
  ]);
  const cash = accounts.get(paymentCode);
  const penalty = accounts.get(CREDIT_ACCOUNTS.penaltyRevenue);
  if (!cash || !penalty) throw new Error("Missing default settlement accounts");

  const draftLines: DraftJournalLine[] = [];

  if (saleJournal?.lines.length) {
    draftLines.push(...flipJournalLines(saleJournal.lines));
  }
  if (cogsJournal?.lines.length) {
    draftLines.push(...flipJournalLines(cogsJournal.lines));
  }

  if (refundGhs > 0) {
    draftLines.push({
      accountId: cash.id,
      debit: 0,
      credit: refundGhs,
      memo: "Credit default · customer refund (60% of down payment)",
    });
  }
  if (penaltyGhs > 0) {
    draftLines.push({
      accountId: penalty.id,
      debit: 0,
      credit: penaltyGhs,
      memo: "Credit default · cancellation fee (40% of down payment)",
    });
  }

  const refSuffix =
    agreement.order.receiptNumber || agreement.orderId.slice(-8).toUpperCase();

  const entry = await createPostedJournal(client, {
    country: GH_ACCOUNTING_COUNTRY,
    entryDate: new Date(),
    reference: `CRDEF-${refSuffix}`,
    memo: `Credit default · penalty GHS ${penaltyGhs} · refund GHS ${refundGhs}`,
    source: "CREDIT_DEFAULT",
    sourceId: agreementId,
    branchId: agreement.order.fulfillmentBranchId,
    createdById: actorUserId,
    lines: draftLines,
  });

  await client.order.update({
    where: { id: agreement.orderId },
    data: { status: "REFUNDED" },
  });

  await client.creditAgreement.update({
    where: { id: agreementId },
    data: {
      status: "DEFAULTED",
      defaultedAt: new Date(),
      penaltyGhs,
      refundGhs,
    },
  });

  return { entry, orderId: agreement.orderId, restoreStock: Boolean(agreement.order.inventoryCommittedAt) };
}

export async function postCreditSaleJournalIfNeeded(
  orderId: string,
  actorUserId?: string
) {
  try {
    return await prisma.$transaction((tx) =>
      postCreditSaleJournal(tx, orderId, actorUserId)
    );
  } catch (err) {
    console.error("[accounting] credit sale post failed", orderId, err);
    return null;
  }
}
