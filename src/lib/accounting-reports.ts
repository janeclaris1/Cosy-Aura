import type { GlAccountType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GH_ACCOUNTING_COUNTRY } from "@/lib/accounting-gh-coa";
import { roundLedger } from "@/lib/accounting";

export type TrialBalanceRow = {
  accountId: string;
  code: string;
  name: string;
  type: GlAccountType;
  debit: number;
  credit: number;
};

export type PlRow = {
  code: string;
  name: string;
  type: "REVENUE" | "EXPENSE";
  amount: number;
};

export type PlSummary = {
  revenue: number;
  expenses: number;
  netIncome: number;
  rows: PlRow[];
};

function monthRange(monthKey: string): { start: Date; end: Date } | null {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  return { start, end };
}

export async function trialBalanceForMonth(
  monthKey: string,
  country = GH_ACCOUNTING_COUNTRY
): Promise<{ rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number }> {
  const range = monthRange(monthKey);
  if (!range) return { rows: [], totalDebit: 0, totalCredit: 0 };

  const lines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        country,
        status: "POSTED",
        entryDate: { gte: range.start, lte: range.end },
      },
    },
    include: {
      account: { select: { id: true, code: true, name: true, type: true } },
    },
  });

  const byAccount = new Map<string, TrialBalanceRow>();

  for (const line of lines) {
    const key = line.accountId;
    const existing = byAccount.get(key) ?? {
      accountId: line.account.id,
      code: line.account.code,
      name: line.account.name,
      type: line.account.type,
      debit: 0,
      credit: 0,
    };
    existing.debit = roundLedger(existing.debit + line.debit);
    existing.credit = roundLedger(existing.credit + line.credit);
    byAccount.set(key, existing);
  }

  const rows = [...byAccount.values()].sort((a, b) => a.code.localeCompare(b.code));
  const totalDebit = roundLedger(rows.reduce((s, r) => s + r.debit, 0));
  const totalCredit = roundLedger(rows.reduce((s, r) => s + r.credit, 0));

  return { rows, totalDebit, totalCredit };
}

export async function profitAndLossForMonth(
  monthKey: string,
  country = GH_ACCOUNTING_COUNTRY
): Promise<PlSummary> {
  const { rows } = await trialBalanceForMonth(monthKey, country);

  const plRows: PlRow[] = [];
  let revenue = 0;
  let expenses = 0;

  for (const row of rows) {
    if (row.type !== "REVENUE" && row.type !== "EXPENSE") continue;
    const net = roundLedger(row.credit - row.debit);
    if (net === 0) continue;

    if (row.type === "REVENUE") {
      revenue += net;
      plRows.push({ code: row.code, name: row.name, type: "REVENUE", amount: net });
    } else {
      const expenseAmount = roundLedger(-net);
      expenses += expenseAmount;
      plRows.push({
        code: row.code,
        name: row.name,
        type: "EXPENSE",
        amount: expenseAmount,
      });
    }
  }

  revenue = roundLedger(revenue);
  expenses = roundLedger(expenses);

  return {
    revenue,
    expenses,
    netIncome: roundLedger(revenue - expenses),
    rows: plRows.sort((a, b) => a.code.localeCompare(b.code)),
  };
}
