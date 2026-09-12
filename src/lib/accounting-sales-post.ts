import type { OrderChannel, PosPaymentMethod, Prisma } from "@prisma/client";
import {
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
import { isRevenueOrder } from "@/lib/dashboard-analytics";
import { extractGhanaPosTaxBreakdown } from "@/lib/pos-taxes";
import { orderTaxableAmount, type TaxReportOrder } from "@/lib/tax-reports";
import { prisma } from "@/lib/prisma";

type TxClient = Prisma.TransactionClient;

type OrderForSales = {
  id: string;
  status: string;
  channel: OrderChannel;
  total: number;
  shippingCost: number;
  shippingCountry: string | null;
  paymentProvider: string | null;
  posPaymentMethod: PosPaymentMethod | null;
  posDiscountAmount: number | null;
  receiptNumber: string | null;
  fulfillmentBranchId: string | null;
  posUserId: string | null;
  createdAt: Date;
  items: Array<{ price: number; quantity: number }>;
};

function posPaymentToSource(method: PosPaymentMethod | null): PaymentSource {
  if (method === "MOMO") return "MOMO";
  if (method === "CASH") return "CASH";
  return "BANK";
}

/** Web gateways settle to bank; POS uses explicit method. */
export function salesPaymentAccountCode(order: {
  channel: OrderChannel;
  posPaymentMethod: PosPaymentMethod | null;
}): string {
  if (order.channel === "POS") {
    return PAYMENT_SOURCE_ACCOUNT[posPaymentToSource(order.posPaymentMethod)];
  }
  return PAYMENT_SOURCE_ACCOUNT.BANK;
}

export async function isGhanaOrder(
  client: TxClient,
  order: Pick<OrderForSales, "shippingCountry" | "fulfillmentBranchId">
): Promise<boolean> {
  if (order.shippingCountry?.trim().toUpperCase() === "GH") return true;
  if (!order.fulfillmentBranchId) return false;
  const branch = await client.branch.findUnique({
    where: { id: order.fulfillmentBranchId },
    select: { country: true },
  });
  return branch?.country?.toUpperCase() === "GH";
}

export async function resolveJournalActor(
  client: TxClient,
  order: Pick<OrderForSales, "posUserId">,
  explicitId?: string
): Promise<string> {
  if (explicitId) return explicitId;
  if (order.posUserId) return order.posUserId;

  const envId = process.env.ACCOUNTING_SYSTEM_USER_ID?.trim();
  if (envId) {
    const user = await client.user.findUnique({ where: { id: envId }, select: { id: true } });
    if (user) return user.id;
  }

  const admin = await client.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (admin) return admin.id;

  throw new Error("No user available to author sales journal");
}

function orderAsTaxReport(order: OrderForSales): TaxReportOrder {
  return {
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
}

export async function postOrderSalesJournal(
  client: TxClient,
  orderId: string,
  actorUserId?: string
) {
  await ensureGhanaCoa(client);

  const order = await client.order.findUnique({
    where: { id: orderId },
    include: {
      items: { select: { price: true, quantity: true } },
    },
  });

  if (!order) throw new Error("Order not found");
  if (!isRevenueOrder(order.status)) {
    throw new Error("Order is not in a paid/revenue status");
  }

  if (!(await isGhanaOrder(client, order))) {
    return null;
  }

  const taxOrder = orderAsTaxReport(order);
  const productInclusive = orderTaxableAmount(taxOrder);
  if (productInclusive <= 0 && order.shippingCost <= 0) {
    return null;
  }

  const taxes = extractGhanaPosTaxBreakdown(productInclusive);
  const shipping = roundLedger(Math.max(0, Number(order.shippingCost || 0)));
  const cashCollected = roundLedger(productInclusive + shipping);

  const paymentCode = salesPaymentAccountCode(order);
  const accountCodes = [
    paymentCode,
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

  const draftLines: DraftJournalLine[] = [];

  if (cashCollected > 0) {
    draftLines.push({
      accountId: acct(paymentCode).id,
      debit: cashCollected,
      credit: 0,
      memo: order.channel === "POS" ? "POS sale collected" : "Online sale collected",
    });
  }
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
      memo: "Shipping income",
    });
  }

  const refSuffix =
    order.receiptNumber ||
    order.id.slice(-8).toUpperCase();
  const channelLabel = order.channel === "POS" ? "POS" : "WEB";
  const paymentLabel =
    order.channel === "POS"
      ? order.posPaymentMethod || "POS"
      : order.paymentProvider || "online";

  return createPostedJournal(client, {
    country: GH_ACCOUNTING_COUNTRY,
    entryDate: order.createdAt,
    reference: `SALE-${refSuffix}`,
    memo: `${channelLabel} sale · ${paymentLabel} · GHS ${cashCollected}`,
    source: "ORDER",
    sourceId: orderId,
    branchId: order.fulfillmentBranchId,
    createdById: await resolveJournalActor(client, order, actorUserId),
    lines: draftLines,
  });
}

/** Post sales journal when an order newly enters a revenue status (idempotent). */
export async function postOrderSalesJournalIfNeeded(
  orderId: string,
  options?: { previousStatus?: string; actorUserId?: string }
) {
  if (
    options?.previousStatus &&
    isRevenueOrder(options.previousStatus)
  ) {
    return null;
  }

  try {
    return await prisma.$transaction((tx) =>
      postOrderSalesJournal(tx, orderId, options?.actorUserId)
    );
  } catch (err) {
    console.error("[accounting] sales post failed", orderId, err);
    return null;
  }
}
