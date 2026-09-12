import type { Prisma, PrismaClient } from "@prisma/client";
import {
  GH_ACCOUNTING_COUNTRY,
  PAYMENT_SOURCE_ACCOUNT,
  type PaymentSource,
} from "@/lib/accounting-gh-coa";
import {
  createPostedJournal,
  getAccountsByCodes,
  roundLedger,
} from "@/lib/accounting";

type TxClient = Prisma.TransactionClient | PrismaClient;

export async function postExpenseJournal(
  client: TxClient,
  input: {
    accountCode: string;
    amount: number;
    entryDate: Date;
    paidFrom: PaymentSource;
    memo?: string;
    vendor?: string;
    branchId?: string | null;
    createdById: string;
  }
) {
  const amount = roundLedger(input.amount);
  if (amount <= 0) throw new Error("Amount must be greater than zero");

  const paymentCode = PAYMENT_SOURCE_ACCOUNT[input.paidFrom];
  const accounts = await getAccountsByCodes(client, GH_ACCOUNTING_COUNTRY, [
    input.accountCode,
    paymentCode,
  ]);

  const expense = accounts.get(input.accountCode);
  const payment = accounts.get(paymentCode);
  if (!expense) throw new Error(`Invalid expense account ${input.accountCode}`);
  if (!payment) throw new Error(`Missing payment account ${paymentCode}`);

  const memoParts = [input.vendor, input.memo].filter(Boolean);
  const memo = memoParts.join(" — ") || undefined;

  return createPostedJournal(client, {
    country: GH_ACCOUNTING_COUNTRY,
    entryDate: input.entryDate,
    reference: `EXP-${input.entryDate.toISOString().slice(0, 10)}-${Date.now().toString(36)}`,
    memo,
    source: "EXPENSE",
    branchId: input.branchId ?? null,
    createdById: input.createdById,
    lines: [
      { accountId: expense.id, debit: amount, credit: 0, memo: expense.name },
      {
        accountId: payment.id,
        debit: 0,
        credit: amount,
        memo: `Paid from ${payment.name}`,
      },
    ],
  });
}
