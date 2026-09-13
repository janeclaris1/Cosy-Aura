import type { Prisma, PrismaClient } from "@prisma/client";
import {
  DEBT_LIABILITY_CODES,
  GH_ACCOUNTING_COUNTRY,
  PAYMENT_SOURCE_ACCOUNT,
  type PaymentSource,
} from "@/lib/accounting-gh-coa";
import {
  createPostedJournal,
  ensureGhanaCoa,
  getAccountsByCodes,
  roundLedger,
  type DraftJournalLine,
} from "@/lib/accounting";

type TxClient = Prisma.TransactionClient | PrismaClient;

const INTEREST_EXPENSE_CODE = "6280";

function parsePaidFrom(raw: string): PaymentSource | null {
  const v = raw.trim().toUpperCase();
  if (v === "BANK" || v === "MOMO" || v === "CASH") return v;
  return null;
}

export { parsePaidFrom as parseDebtPaidFrom };

export function assertDebtLiabilityCode(code: string) {
  if (!(DEBT_LIABILITY_CODES as readonly string[]).includes(code)) {
    throw new Error("Select a valid loan liability account (2200 or 2210)");
  }
}

/** DR Bank/MoMo/Cash, CR Loan — when funds are received. */
export async function postDebtDrawJournal(
  client: TxClient,
  input: {
    glAccountCode: string;
    amount: number;
    entryDate: Date;
    paidTo: PaymentSource;
    lender: string;
    debtId: string;
    createdById: string;
  }
) {
  await ensureGhanaCoa(client);
  const amount = roundLedger(input.amount);
  if (amount <= 0) throw new Error("Draw amount must be greater than zero");

  const paymentCode = PAYMENT_SOURCE_ACCOUNT[input.paidTo];
  const accounts = await getAccountsByCodes(client, GH_ACCOUNTING_COUNTRY, [
    input.glAccountCode,
    paymentCode,
  ]);
  const loan = accounts.get(input.glAccountCode);
  const cash = accounts.get(paymentCode);
  if (!loan) throw new Error(`Missing liability account ${input.glAccountCode}`);
  if (!cash) throw new Error(`Missing payment account ${paymentCode}`);

  const lines: DraftJournalLine[] = [
    { accountId: cash.id, debit: amount, credit: 0, memo: `Loan proceeds — ${input.lender}` },
    { accountId: loan.id, debit: 0, credit: amount, memo: input.lender },
  ];

  return createPostedJournal(client, {
    country: GH_ACCOUNTING_COUNTRY,
    entryDate: input.entryDate,
    reference: `DEBT-DRAW-${input.debtId.slice(0, 8).toUpperCase()}`,
    memo: `Loan draw — ${input.lender}`,
    source: "DEBT",
    sourceId: `${input.debtId}-draw`,
    createdById: input.createdById,
    lines,
  });
}

/** DR Loan (+ interest expense), CR Bank/MoMo/Cash — repayment. */
export async function postDebtPaymentJournal(
  client: TxClient,
  input: {
    glAccountCode: string;
    principalGhs: number;
    interestGhs: number;
    entryDate: Date;
    paidFrom: PaymentSource;
    lender: string;
    paymentId: string;
    createdById: string;
    memo?: string;
  }
) {
  await ensureGhanaCoa(client);
  const principal = roundLedger(input.principalGhs);
  const interest = roundLedger(input.interestGhs);
  const total = roundLedger(principal + interest);
  if (total <= 0) throw new Error("Payment amount must be greater than zero");

  const paymentCode = PAYMENT_SOURCE_ACCOUNT[input.paidFrom];
  const codes = [input.glAccountCode, paymentCode];
  if (interest > 0) codes.push(INTEREST_EXPENSE_CODE);

  const accounts = await getAccountsByCodes(client, GH_ACCOUNTING_COUNTRY, codes);
  const loan = accounts.get(input.glAccountCode);
  const cash = accounts.get(paymentCode);
  if (!loan) throw new Error(`Missing liability account ${input.glAccountCode}`);
  if (!cash) throw new Error(`Missing payment account ${paymentCode}`);

  const lines: DraftJournalLine[] = [];
  if (principal > 0) {
    lines.push({
      accountId: loan.id,
      debit: principal,
      credit: 0,
      memo: `Principal — ${input.lender}`,
    });
  }
  if (interest > 0) {
    const interestAcct = accounts.get(INTEREST_EXPENSE_CODE);
    if (!interestAcct) throw new Error("Missing interest expense account 6280");
    lines.push({
      accountId: interestAcct.id,
      debit: interest,
      credit: 0,
      memo: `Interest — ${input.lender}`,
    });
  }
  lines.push({
    accountId: cash.id,
    debit: 0,
    credit: total,
    memo: `Repayment from ${cash.name}`,
  });

  return createPostedJournal(client, {
    country: GH_ACCOUNTING_COUNTRY,
    entryDate: input.entryDate,
    reference: `DEBT-PAY-${input.paymentId.slice(0, 8).toUpperCase()}`,
    memo: input.memo ?? `Debt repayment — ${input.lender}`,
    source: "DEBT",
    sourceId: input.paymentId,
    createdById: input.createdById,
    lines,
  });
}
