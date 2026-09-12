import type { Prisma } from "@prisma/client";
import { COGS_ACCOUNTS, GH_ACCOUNTING_COUNTRY } from "@/lib/accounting-gh-coa";
import {
  createPostedJournal,
  ensureGhanaCoa,
  getAccountsByCodes,
  roundLedger,
  type DraftJournalLine,
} from "@/lib/accounting";
import {
  isGhanaOrder,
  resolveJournalActor,
} from "@/lib/accounting-sales-post";
import { isRevenueOrder } from "@/lib/dashboard-analytics";
import { lineCogsTotal, unitCostForBottleSize } from "@/lib/cogs";
import { prisma } from "@/lib/prisma";

type TxClient = Prisma.TransactionClient;

type OrderItemForCogs = {
  quantity: number;
  bottleSize: number;
  unitCostGhs: number | null;
  fragrance: { costPriceGhs: number; bottleSize: number } | null;
};

function resolveLineUnitCost(item: OrderItemForCogs): number {
  if (item.unitCostGhs != null && item.unitCostGhs > 0) {
    return item.unitCostGhs;
  }
  if (!item.fragrance) return 0;
  return unitCostForBottleSize(
    item.fragrance.costPriceGhs,
    item.fragrance.bottleSize,
    item.bottleSize
  );
}

export async function postOrderCogsJournal(
  client: TxClient,
  orderId: string,
  actorUserId?: string
) {
  await ensureGhanaCoa(client);

  const order = await client.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          fragrance: { select: { costPriceGhs: true, bottleSize: true } },
        },
      },
    },
  });

  if (!order) throw new Error("Order not found");
  if (!isRevenueOrder(order.status)) {
    throw new Error("Order is not in a paid/revenue status");
  }
  if (!(await isGhanaOrder(client, order))) {
    return null;
  }

  let totalCogs = 0;
  for (const item of order.items) {
    const unitCost = resolveLineUnitCost(item);
    totalCogs += lineCogsTotal(item.quantity, unitCost);
  }
  totalCogs = roundLedger(totalCogs);
  if (totalCogs <= 0) return null;

  const accounts = await getAccountsByCodes(client, GH_ACCOUNTING_COUNTRY, [
    COGS_ACCOUNTS.cogs,
    COGS_ACCOUNTS.inventoryFinished,
  ]);

  function acct(code: string) {
    const a = accounts.get(code);
    if (!a) throw new Error(`Missing GL account ${code}`);
    return a;
  }

  const draftLines: DraftJournalLine[] = [
    {
      accountId: acct(COGS_ACCOUNTS.cogs).id,
      debit: totalCogs,
      credit: 0,
      memo: "Cost of goods sold",
    },
    {
      accountId: acct(COGS_ACCOUNTS.inventoryFinished).id,
      debit: 0,
      credit: totalCogs,
      memo: "Inventory relief",
    },
  ];

  const refSuffix = order.receiptNumber || order.id.slice(-8).toUpperCase();

  return createPostedJournal(client, {
    country: GH_ACCOUNTING_COUNTRY,
    entryDate: order.createdAt,
    reference: `COGS-${refSuffix}`,
    memo: `COGS for order · GHS ${totalCogs}`,
    source: "ORDER_COGS",
    sourceId: orderId,
    branchId: order.fulfillmentBranchId,
    createdById: await resolveJournalActor(client, order, actorUserId),
    lines: draftLines,
  });
}

export async function postOrderCogsJournalIfNeeded(
  orderId: string,
  options?: { previousStatus?: string; actorUserId?: string }
) {
  if (options?.previousStatus && isRevenueOrder(options.previousStatus)) {
    return null;
  }

  try {
    return await prisma.$transaction((tx) =>
      postOrderCogsJournal(tx, orderId, options?.actorUserId)
    );
  } catch (err) {
    console.error("[accounting] COGS post failed", orderId, err);
    return null;
  }
}
