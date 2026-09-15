import type { Prisma } from "@prisma/client";
import {
  createPostedJournal,
  ensureGhanaCoa,
  getAccountsByCodes,
  resolveAccountingActor,
  roundLedger,
  type DraftJournalLine,
} from "@/lib/accounting";
import {
  GH_ACCOUNTING_COUNTRY,
  INVENTORY_ACCOUNTS,
} from "@/lib/accounting-gh-coa";
import { unitCostForBottleSize } from "@/lib/cogs";
import { prisma } from "@/lib/prisma";

type TxClient = Prisma.TransactionClient;

export type InventoryMovementInput = {
  branchId: string;
  branchCountry: string;
  fragranceId: string;
  bottleSize: number;
  /** Positive = stock in, negative = stock out (damage / shrinkage). */
  delta: number;
  actorUserId: string;
  /** Unique id for idempotent journal (e.g. audit log id). */
  sourceId: string;
  productLabel: string;
  reason?: string;
};

async function resolveStockUnitCostGhs(
  client: TxClient,
  fragranceId: string,
  bottleSize: number
): Promise<number> {
  const product = await client.fragrance.findUnique({
    where: { id: fragranceId },
    select: { costPriceGhs: true, bottleSize: true, productType: true },
  });
  if (!product) return 0;
  return unitCostForBottleSize(
    product.productType,
    product.costPriceGhs,
    product.bottleSize,
    bottleSize
  );
}

function movementAmount(unitCostGhs: number, quantity: number): number {
  return roundLedger(Math.abs(quantity) * unitCostGhs);
}

async function postInventoryJournal(
  client: TxClient,
  input: InventoryMovementInput & {
    source: "INVENTORY_RECEIPT" | "INVENTORY_WRITEOFF";
    quantity: number;
    amount: number;
  }
) {
  if (input.branchCountry.trim().toUpperCase() !== "GH") return null;
  if (input.amount <= 0) return null;

  await ensureGhanaCoa(client);

  const accounts = await getAccountsByCodes(client, GH_ACCOUNTING_COUNTRY, [
    INVENTORY_ACCOUNTS.finishedGoods,
    INVENTORY_ACCOUNTS.accountsPayable,
    INVENTORY_ACCOUNTS.shrinkage,
  ]);

  function acct(code: string) {
    const row = accounts.get(code);
    if (!row) throw new Error(`Missing GL account ${code}`);
    return row;
  }

  const lines: DraftJournalLine[] =
    input.source === "INVENTORY_RECEIPT"
      ? [
          {
            accountId: acct(INVENTORY_ACCOUNTS.finishedGoods).id,
            debit: input.amount,
            credit: 0,
            memo: "Stock received",
          },
          {
            accountId: acct(INVENTORY_ACCOUNTS.accountsPayable).id,
            debit: 0,
            credit: input.amount,
            memo: "Goods received (AP)",
          },
        ]
      : [
          {
            accountId: acct(INVENTORY_ACCOUNTS.shrinkage).id,
            debit: input.amount,
            credit: 0,
            memo: "Inventory shrinkage",
          },
          {
            accountId: acct(INVENTORY_ACCOUNTS.finishedGoods).id,
            debit: 0,
            credit: input.amount,
            memo: "Inventory relief",
          },
        ];

  const refPrefix = input.source === "INVENTORY_RECEIPT" ? "RCV" : "ADJ";
  const actorId = await resolveAccountingActor(client, input.actorUserId);

  return createPostedJournal(client, {
    country: GH_ACCOUNTING_COUNTRY,
    entryDate: new Date(),
    reference: `${refPrefix}-${input.sourceId.slice(0, 12).toUpperCase()}`,
    memo: [
      input.productLabel,
      `${input.bottleSize}ml × ${input.quantity}`,
      `GHS ${input.amount}`,
      input.reason,
    ]
      .filter(Boolean)
      .join(" · "),
    source: input.source,
    sourceId: input.sourceId,
    branchId: input.branchId,
    createdById: actorId,
    lines,
  });
}

/** Post GL inventory receipt or write-off for a branch stock delta. */
export async function postInventoryMovementJournal(
  client: TxClient,
  input: InventoryMovementInput
) {
  const delta = Math.trunc(input.delta);
  if (delta === 0) return null;

  const unitCostGhs = await resolveStockUnitCostGhs(
    client,
    input.fragranceId,
    input.bottleSize
  );
  const amount = movementAmount(unitCostGhs, delta);
  if (amount <= 0) return null;

  return postInventoryJournal(client, {
    ...input,
    delta,
    quantity: Math.abs(delta),
    amount,
    source: delta > 0 ? "INVENTORY_RECEIPT" : "INVENTORY_WRITEOFF",
  });
}

/** Fire-and-forget wrapper for API routes (logs failures, never blocks stock save). */
export async function postInventoryMovementIfNeeded(
  input: InventoryMovementInput
): Promise<void> {
  try {
    await prisma.$transaction((tx) => postInventoryMovementJournal(tx, input));
  } catch (err) {
    console.error("[accounting] inventory movement post failed", input.sourceId, err);
  }
}
