import type { GlAccountType, JournalSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  GH_ACCOUNTING_COUNTRY,
  PAYMENT_SOURCE_ACCOUNT,
  type PaymentSource,
} from "@/lib/accounting-gh-coa";
import { roundLedger } from "@/lib/accounting-ledger";

export type {
  TrialBalanceRow,
  PlRow,
  PlSummary,
  BalanceSheetRow,
  BalanceSheetSummary,
  PlTrendPoint,
  CashFlowLine,
  CashFlowSummary,
  FinancialRatios,
} from "@/lib/accounting-reports-types";

import type {
  TrialBalanceRow,
  PlRow,
  PlSummary,
  BalanceSheetRow,
  BalanceSheetSummary,
  PlTrendPoint,
  CashFlowLine,
  CashFlowSummary,
  FinancialRatios,
} from "@/lib/accounting-reports-types";

const CASH_CODES = new Set(["1010", "1020", "1030"]);
const COGS_CODES = new Set(["5100", "5110", "5120"]);
const INVESTING_ASSET_PREFIXES = ["1300", "1310"];

type AccountBalanceRow = {
  accountId: string;
  code: string;
  name: string;
  type: GlAccountType;
  debit: number;
  credit: number;
};

function parseMonthRange(monthKey: string): { start: Date; end: Date } | null {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  return { start, end };
}

function monthBefore(monthKey: string): string | null {
  const range = parseMonthRange(monthKey);
  if (!range) return null;
  const d = new Date(range.start);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function listMonthsEndingAt(endMonth: string, count: number): string[] {
  const months: string[] = [];
  let cursor: string | null = endMonth;
  for (let i = 0; i < count && cursor; i += 1) {
    months.unshift(cursor);
    cursor = monthBefore(cursor);
  }
  return months;
}

function signedBalance(type: GlAccountType, debit: number, credit: number): number {
  const net = roundLedger(debit - credit);
  if (type === "ASSET" || type === "EXPENSE") return net;
  return roundLedger(-net);
}

async function aggregateBalances(
  country: string,
  throughDate: Date,
  fromDate?: Date
): Promise<AccountBalanceRow[]> {
  const lines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        country,
        status: "POSTED",
        entryDate: fromDate
          ? { gte: fromDate, lte: throughDate }
          : { lte: throughDate },
      },
    },
    include: {
      account: { select: { id: true, code: true, name: true, type: true } },
    },
  });

  const byAccount = new Map<string, AccountBalanceRow>();

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

  return [...byAccount.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function rowsFromBalances(
  balances: AccountBalanceRow[],
  type: GlAccountType
): BalanceSheetRow[] {
  return balances
    .filter((row) => row.type === type)
    .map((row) => ({
      code: row.code,
      name: row.name,
      amount: Math.abs(signedBalance(row.type, row.debit, row.credit)),
    }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => a.code.localeCompare(b.code));
}

function cumulativeNetIncome(balances: AccountBalanceRow[]): number {
  let revenue = 0;
  let expenses = 0;
  for (const row of balances) {
    if (row.type === "REVENUE") {
      revenue += signedBalance(row.type, row.debit, row.credit);
    } else if (row.type === "EXPENSE") {
      expenses += signedBalance(row.type, row.debit, row.credit);
    }
  }
  return roundLedger(revenue - expenses);
}

export async function trialBalanceForMonth(
  monthKey: string,
  country = GH_ACCOUNTING_COUNTRY
): Promise<{ rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number }> {
  const range = parseMonthRange(monthKey);
  if (!range) return { rows: [], totalDebit: 0, totalCredit: 0 };

  const balances = await aggregateBalances(country, range.end, range.start);
  const rows: TrialBalanceRow[] = balances.map((row) => ({
    accountId: row.accountId,
    code: row.code,
    name: row.name,
    type: row.type,
    debit: row.debit,
    credit: row.credit,
  }));

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

export async function profitAndLossTrend(
  endMonthKey: string,
  months = 6,
  country = GH_ACCOUNTING_COUNTRY
): Promise<{ months: PlTrendPoint[] }> {
  const keys = listMonthsEndingAt(endMonthKey, months);
  const points: PlTrendPoint[] = [];

  for (const month of keys) {
    const pl = await profitAndLossForMonth(month, country);
    points.push({
      month,
      revenue: pl.revenue,
      expenses: pl.expenses,
      netIncome: pl.netIncome,
    });
  }

  return { months: points };
}

export async function balanceSheetAsOf(
  monthKey: string,
  country = GH_ACCOUNTING_COUNTRY
): Promise<BalanceSheetSummary> {
  const range = parseMonthRange(monthKey);
  if (!range) {
    return {
      asOf: monthKey,
      assets: [],
      liabilities: [],
      equity: [],
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      balanced: true,
    };
  }

  const balances = await aggregateBalances(country, range.end);
  const assets = rowsFromBalances(balances, "ASSET");
  const liabilities = rowsFromBalances(balances, "LIABILITY");
  const equityAccounts = rowsFromBalances(balances, "EQUITY");
  const netIncome = cumulativeNetIncome(balances);

  const equity: BalanceSheetRow[] = [...equityAccounts];
  if (netIncome !== 0) {
    equity.push({
      code: "RE",
      name: "Accumulated net income (unclosed)",
      amount: netIncome,
    });
  }

  const totalAssets = roundLedger(assets.reduce((s, r) => s + r.amount, 0));
  const totalLiabilities = roundLedger(liabilities.reduce((s, r) => s + r.amount, 0));
  const totalEquity = roundLedger(
    equityAccounts.reduce((s, r) => s + r.amount, 0) + netIncome
  );

  return {
    asOf: monthKey,
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    balanced:
      roundLedger(totalAssets) === roundLedger(totalLiabilities + totalEquity),
  };
}

function cashBalanceFromRows(balances: AccountBalanceRow[]): number {
  return roundLedger(
    balances
      .filter((row) => CASH_CODES.has(row.code))
      .reduce((sum, row) => sum + signedBalance(row.type, row.debit, row.credit), 0)
  );
}

function categorizeManualCashFlow(
  cashDelta: number,
  counterpartTypes: GlAccountType[],
  counterpartCodes: string[]
): "operating" | "investing" | "financing" {
  if (counterpartCodes.some((code) => INVESTING_ASSET_PREFIXES.includes(code))) {
    return "investing";
  }
  if (
    counterpartTypes.includes("LIABILITY") ||
    counterpartCodes.some((code) => code.startsWith("22"))
  ) {
    return "financing";
  }
  if (counterpartTypes.includes("EQUITY")) {
    return "financing";
  }
  return "operating";
}

export async function cashFlowForMonth(
  monthKey: string,
  country = GH_ACCOUNTING_COUNTRY
): Promise<CashFlowSummary> {
  const range = parseMonthRange(monthKey);
  if (!range) {
    return {
      month: monthKey,
      openingCash: 0,
      operating: [],
      investing: [],
      financing: [],
      netOperating: 0,
      netInvesting: 0,
      netFinancing: 0,
      netChange: 0,
      closingCash: 0,
    };
  }

  const priorEnd = new Date(range.start);
  priorEnd.setUTCDate(0);

  const [openingBalances, closingBalances, entries] = await Promise.all([
    aggregateBalances(country, priorEnd),
    aggregateBalances(country, range.end),
    prisma.journalEntry.findMany({
      where: {
        country,
        status: "POSTED",
        entryDate: { gte: range.start, lte: range.end },
      },
      include: {
        lines: {
          include: {
            account: { select: { code: true, name: true, type: true } },
          },
        },
      },
      orderBy: { entryDate: "asc" },
    }),
  ]);

  const openingCash = cashBalanceFromRows(openingBalances);
  const closingCash = cashBalanceFromRows(closingBalances);

  const operatingMap = new Map<string, number>();
  const investingMap = new Map<string, number>();
  const financingMap = new Map<string, number>();

  function addFlow(
    bucket: Map<string, number>,
    label: string,
    amount: number
  ) {
    if (amount === 0) return;
    bucket.set(label, roundLedger((bucket.get(label) ?? 0) + amount));
  }

  for (const entry of entries) {
    const cashLines = entry.lines.filter((line) => CASH_CODES.has(line.account.code));
    if (!cashLines.length) continue;

    const nonCashLines = entry.lines.filter((line) => !CASH_CODES.has(line.account.code));
    const counterpartTypes = nonCashLines.map((line) => line.account.type);
    const counterpartCodes = nonCashLines.map((line) => line.account.code);

    for (const cashLine of cashLines) {
      const inflow = roundLedger(cashLine.debit - cashLine.credit);
      if (inflow === 0) continue;

      const source = entry.source as JournalSource;

      if (source === "ORDER") {
        addFlow(operatingMap, "Cash received from customers", inflow);
      } else if (source === "EXPENSE") {
        addFlow(operatingMap, "Cash paid for operating expenses", inflow);
      } else if (source === "PAYROLL") {
        addFlow(operatingMap, "Cash paid to employees", inflow);
      } else if (source === "DEBT") {
        addFlow(
          financingMap,
          inflow > 0 ? "Loan proceeds received" : "Debt principal & interest paid",
          inflow
        );
      } else if (source === "ORDER_COGS") {
        // Non-cash inventory movement — skip
      } else {
        const category = categorizeManualCashFlow(inflow, counterpartTypes, counterpartCodes);
        const label =
          category === "investing"
            ? inflow > 0
              ? "Proceeds from asset disposals"
              : "Purchase of equipment & assets"
            : inflow > 0
              ? "Loan proceeds & capital injected"
              : "Debt repayments & owner withdrawals";

        if (category === "investing") addFlow(investingMap, label, inflow);
        else if (category === "financing") addFlow(financingMap, label, inflow);
        else {
          const operatingLabel = counterpartTypes.includes("REVENUE")
            ? "Cash from other revenue"
            : "Other operating cash flows";
          addFlow(operatingMap, operatingLabel, inflow);
        }
      }
    }
  }

  const toLines = (map: Map<string, number>): CashFlowLine[] =>
    [...map.entries()]
      .map(([label, amount]) => ({ label, amount }))
      .filter((line) => line.amount !== 0)
      .sort((a, b) => a.label.localeCompare(b.label));

  const operating = toLines(operatingMap);
  const investing = toLines(investingMap);
  const financing = toLines(financingMap);

  const netOperating = roundLedger(operating.reduce((s, l) => s + l.amount, 0));
  const netInvesting = roundLedger(investing.reduce((s, l) => s + l.amount, 0));
  const netFinancing = roundLedger(financing.reduce((s, l) => s + l.amount, 0));
  const netChange = roundLedger(netOperating + netInvesting + netFinancing);

  return {
    month: monthKey,
    openingCash,
    operating,
    investing,
    financing,
    netOperating,
    netInvesting,
    netFinancing,
    netChange,
    closingCash,
  };
}

function sumCodes(balances: AccountBalanceRow[], predicate: (code: string) => boolean): number {
  return roundLedger(
    balances
      .filter((row) => predicate(row.code))
      .reduce((sum, row) => sum + Math.abs(signedBalance(row.type, row.debit, row.credit)), 0)
  );
}

export async function financialRatiosForMonth(
  monthKey: string,
  country = GH_ACCOUNTING_COUNTRY
): Promise<FinancialRatios> {
  const range = parseMonthRange(monthKey);
  const pl = await profitAndLossForMonth(monthKey, country);
  const balances = range
    ? await aggregateBalances(country, range.end)
    : [];

  const currentAssets = sumCodes(
    balances,
    (code) =>
      CASH_CODES.has(code) ||
      code.startsWith("11") ||
      code === "1120" ||
      code.startsWith("110")
  );
  const quickAssets = sumCodes(balances, (code) => CASH_CODES.has(code));
  const currentLiabilities = sumCodes(
    balances,
    (code) => code.startsWith("21") && !code.startsWith("22")
  );
  const totalDebt = sumCodes(
    balances,
    (code) => code.startsWith("21") || code.startsWith("22")
  );

  const bs = await balanceSheetAsOf(monthKey, country);
  const totalEquity = bs.totalEquity;

  const cogs = roundLedger(
    pl.rows
      .filter((row) => row.type === "EXPENSE" && COGS_CODES.has(row.code))
      .reduce((s, row) => s + row.amount, 0)
  );
  const grossProfit = roundLedger(pl.revenue - cogs);

  const ratio = (num: number, den: number): number | null =>
    den > 0 ? roundLedger(num / den) : null;

  return {
    month: monthKey,
    currentRatio: ratio(currentAssets, currentLiabilities),
    quickRatio: ratio(quickAssets, currentLiabilities),
    debtToEquity: ratio(totalDebt, totalEquity),
    grossMarginPct:
      pl.revenue > 0 ? roundLedger((grossProfit / pl.revenue) * 100) : null,
    netMarginPct:
      pl.revenue > 0 ? roundLedger((pl.netIncome / pl.revenue) * 100) : null,
    totalDebt,
    totalEquity,
    revenue: pl.revenue,
    grossProfit,
    netIncome: pl.netIncome,
  };
}

type DebtRegisterSummary = {
  activeCount: number;
  totalOwed: number;
  dueWithin90Days: number;
  debts: Awaited<ReturnType<typeof fetchActiveDebts>>;
};

function emptyDebtRegisterSummary(): DebtRegisterSummary {
  return { activeCount: 0, totalOwed: 0, dueWithin90Days: 0, debts: [] };
}

async function fetchActiveDebts(country: string) {
  return prisma.companyDebt.findMany({
    where: { country, status: "ACTIVE" },
    orderBy: { maturityDate: "asc" },
  });
}

/** Sum of active debt balances from the debt register (may exceed GL if not yet posted). */
export async function debtRegisterSummary(
  country = GH_ACCOUNTING_COUNTRY
): Promise<DebtRegisterSummary> {
  // Stale Prisma client (dev server not restarted after migrate) lacks companyDebt.
  if (typeof (prisma as { companyDebt?: unknown }).companyDebt === "undefined") {
    return emptyDebtRegisterSummary();
  }

  try {
    const debts = await fetchActiveDebts(country);
    const totalOwed = roundLedger(debts.reduce((s, d) => s + d.balanceGhs, 0));
    const dueWithin90Days = debts.filter((d) => {
      if (!d.maturityDate) return false;
      const days =
        (d.maturityDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return days >= 0 && days <= 90;
    });

    return {
      activeCount: debts.length,
      totalOwed,
      dueWithin90Days: dueWithin90Days.length,
      debts,
    };
  } catch (error) {
    console.warn("[accounting] debt register unavailable:", error);
    return emptyDebtRegisterSummary();
  }
}

export function paymentSourceFromCode(code: string): PaymentSource {
  if (code === PAYMENT_SOURCE_ACCOUNT.MOMO) return "MOMO";
  if (code === PAYMENT_SOURCE_ACCOUNT.CASH) return "CASH";
  return "BANK";
}
