import type { GlAccountType } from "@prisma/client";

/** Shared report DTO types — no Prisma client / server-only imports. */

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

export type BalanceSheetRow = {
  code: string;
  name: string;
  amount: number;
};

export type BalanceSheetSummary = {
  asOf: string;
  assets: BalanceSheetRow[];
  liabilities: BalanceSheetRow[];
  equity: BalanceSheetRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  balanced: boolean;
};

export type PlTrendPoint = {
  month: string;
  revenue: number;
  expenses: number;
  netIncome: number;
};

export type CashFlowLine = {
  label: string;
  amount: number;
};

export type CashFlowSummary = {
  month: string;
  openingCash: number;
  operating: CashFlowLine[];
  investing: CashFlowLine[];
  financing: CashFlowLine[];
  netOperating: number;
  netInvesting: number;
  netFinancing: number;
  netChange: number;
  closingCash: number;
};

export type FinancialRatios = {
  month: string;
  currentRatio: number | null;
  quickRatio: number | null;
  debtToEquity: number | null;
  grossMarginPct: number | null;
  netMarginPct: number | null;
  totalDebt: number;
  totalEquity: number;
  revenue: number;
  grossProfit: number;
  netIncome: number;
};
