import { roundLedger } from "@/lib/accounting-ledger";
import type {
  BalanceSheetRow,
  BalanceSheetSummary,
  CashFlowSummary,
  FinancialRatios,
  PlSummary,
  PlTrendPoint,
  TrialBalanceRow,
} from "@/lib/accounting-reports-types";

const COGS_CODES = new Set(["5100", "5110", "5120"]);

export type FinancialReportLineKind =
  | "section"
  | "subsection"
  | "item"
  | "subtotal"
  | "total"
  | "grand-total"
  | "header-row"
  | "note";

export type FinancialReportLine = {
  id: string;
  kind: FinancialReportLineKind;
  label: string;
  amounts: (number | null)[];
  format?: "currency" | "ratio" | "percent";
};

export type ClassifiedBalanceSheet = {
  currentAssets: BalanceSheetRow[];
  fixedAssets: BalanceSheetRow[];
  currentLiabilities: BalanceSheetRow[];
  longTermLiabilities: BalanceSheetRow[];
  equity: BalanceSheetRow[];
  totals: {
    currentAssets: number;
    fixedAssets: number;
    totalAssets: number;
    currentLiabilities: number;
    longTermLiabilities: number;
    totalLiabilities: number;
    totalEquity: number;
    totalLiabilitiesAndEquity: number;
  };
};

function sumRows(rows: BalanceSheetRow[]): number {
  return roundLedger(rows.reduce((s, r) => s + r.amount, 0));
}

function classifyAsset(code: string): "current" | "fixed" {
  if (code.startsWith("13")) return "fixed";
  return "current";
}

function classifyLiability(code: string): "current" | "longTerm" {
  if (code === "2200") return "longTerm";
  return "current";
}

export function classifyBalanceSheet(summary: BalanceSheetSummary): ClassifiedBalanceSheet {
  const currentAssets = summary.assets.filter((r) => classifyAsset(r.code) === "current");
  const fixedAssets = summary.assets.filter((r) => classifyAsset(r.code) === "fixed");
  const currentLiabilities = summary.liabilities.filter(
    (r) => classifyLiability(r.code) === "current"
  );
  const longTermLiabilities = summary.liabilities.filter(
    (r) => classifyLiability(r.code) === "longTerm"
  );

  const totalCurrentAssets = sumRows(currentAssets);
  const totalFixedAssets = sumRows(fixedAssets);
  const totalCurrentLiabilities = sumRows(currentLiabilities);
  const totalLongTermLiabilities = sumRows(longTermLiabilities);

  return {
    currentAssets,
    fixedAssets,
    currentLiabilities,
    longTermLiabilities,
    equity: summary.equity,
    totals: {
      currentAssets: totalCurrentAssets,
      fixedAssets: totalFixedAssets,
      totalAssets: summary.totalAssets,
      currentLiabilities: totalCurrentLiabilities,
      longTermLiabilities: totalLongTermLiabilities,
      totalLiabilities: summary.totalLiabilities,
      totalEquity: summary.totalEquity,
      totalLiabilitiesAndEquity: roundLedger(
        summary.totalLiabilities + summary.totalEquity
      ),
    },
  };
}

function itemLines(prefix: string, rows: BalanceSheetRow[]): FinancialReportLine[] {
  return rows.map((row) => ({
    id: `${prefix}-${row.code}`,
    kind: "item" as const,
    label: row.name,
    amounts: [row.amount],
  }));
}

function subtotalLine(id: string, label: string, amount: number): FinancialReportLine {
  return { id, kind: "subtotal", label, amounts: [amount] };
}

export function buildBalanceSheetLines(summary: BalanceSheetSummary): FinancialReportLine[] {
  const c = classifyBalanceSheet(summary);
  const lines: FinancialReportLine[] = [
    { id: "assets-section", kind: "section", label: "Assets", amounts: [null] },
    { id: "ca-sub", kind: "subsection", label: "Current assets", amounts: [null] },
    ...itemLines("ca", c.currentAssets),
    subtotalLine("ca-total", "Total current assets", c.totals.currentAssets),
    { id: "fa-sub", kind: "subsection", label: "Fixed assets", amounts: [null] },
    ...itemLines("fa", c.fixedAssets),
    subtotalLine("fa-total", "Total fixed assets", c.totals.fixedAssets),
    { id: "assets-total", kind: "total", label: "Total assets", amounts: [c.totals.totalAssets] },
    { id: "liab-section", kind: "section", label: "Liabilities", amounts: [null] },
    { id: "cl-sub", kind: "subsection", label: "Current liabilities", amounts: [null] },
    ...itemLines("cl", c.currentLiabilities),
    subtotalLine("cl-total", "Total current liabilities", c.totals.currentLiabilities),
    { id: "ltl-sub", kind: "subsection", label: "Long-term liabilities", amounts: [null] },
    ...itemLines("ltl", c.longTermLiabilities),
    subtotalLine("ltl-total", "Total long-term liabilities", c.totals.longTermLiabilities),
    {
      id: "liab-total",
      kind: "total",
      label: "Total liabilities",
      amounts: [c.totals.totalLiabilities],
    },
    { id: "eq-section", kind: "section", label: "Equity", amounts: [null] },
    ...itemLines("eq", c.equity),
    { id: "eq-total", kind: "total", label: "Total equity", amounts: [c.totals.totalEquity] },
    {
      id: "le-grand",
      kind: "grand-total",
      label: "Total liabilities and equity",
      amounts: [c.totals.totalLiabilitiesAndEquity],
    },
  ];

  if (!summary.balanced) {
    lines.push({
      id: "balance-note",
      kind: "note",
      label: "Warning: Assets do not equal liabilities plus equity — review journal entries.",
      amounts: [null],
    });
  }

  return lines;
}

export function buildProfitAndLossLines(pl: PlSummary): FinancialReportLine[] {
  const revenueRows = pl.rows.filter((r) => r.type === "REVENUE");
  const cogsRows = pl.rows.filter((r) => COGS_CODES.has(r.code));
  const opexRows = pl.rows.filter(
    (r) => r.type === "EXPENSE" && !COGS_CODES.has(r.code)
  );

  const totalCogs = roundLedger(cogsRows.reduce((s, r) => s + r.amount, 0));
  const totalOpex = roundLedger(opexRows.reduce((s, r) => s + r.amount, 0));
  const grossProfit = roundLedger(pl.revenue - totalCogs);

  const lines: FinancialReportLine[] = [
    { id: "rev-section", kind: "section", label: "Revenue", amounts: [null] },
    ...revenueRows.map((r) => ({
      id: `rev-${r.code}`,
      kind: "item" as const,
      label: r.name,
      amounts: [r.amount],
    })),
    subtotalLine("rev-total", "Total revenue", pl.revenue),
    { id: "cogs-section", kind: "section", label: "Cost of goods sold", amounts: [null] },
    ...cogsRows.map((r) => ({
      id: `cogs-${r.code}`,
      kind: "item" as const,
      label: r.name,
      amounts: [r.amount],
    })),
    subtotalLine("cogs-total", "Total cost of goods sold", totalCogs),
    { id: "gross", kind: "subtotal", label: "Gross profit", amounts: [grossProfit] },
    { id: "opex-section", kind: "section", label: "Operating expenses", amounts: [null] },
    ...opexRows.map((r) => ({
      id: `opex-${r.code}`,
      kind: "item" as const,
      label: r.name,
      amounts: [r.amount],
    })),
    subtotalLine("opex-total", "Total operating expenses", totalOpex),
    { id: "net", kind: "grand-total", label: "Net income", amounts: [pl.netIncome] },
  ];

  return lines;
}

export function buildTrendLines(months: PlTrendPoint[]): {
  columnLabels: string[];
  lines: FinancialReportLine[];
} {
  const columnLabels = months.map((m) => {
    const [y, mo] = m.month.split("-").map(Number);
    if (!y || !mo) return m.month;
    return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  });

  const lines: FinancialReportLine[] = [
    {
      id: "rev-row",
      kind: "item",
      label: "Revenue",
      amounts: months.map((m) => m.revenue),
    },
    {
      id: "exp-row",
      kind: "item",
      label: "Expenses",
      amounts: months.map((m) => m.expenses),
    },
    {
      id: "ni-row",
      kind: "grand-total",
      label: "Net income",
      amounts: months.map((m) => m.netIncome),
    },
  ];

  return { columnLabels, lines };
}

function cashFlowBlock(
  prefix: string,
  title: string,
  items: { label: string; amount: number }[],
  net: number
): FinancialReportLine[] {
  const lines: FinancialReportLine[] = [
    { id: `${prefix}-section`, kind: "section", label: title, amounts: [null] },
  ];
  if (!items.length) {
    lines.push({
      id: `${prefix}-empty`,
      kind: "item",
      label: "No activity",
      amounts: [null],
    });
  } else {
    for (const item of items) {
      lines.push({
        id: `${prefix}-${item.label}`,
        kind: "item",
        label: item.label,
        amounts: [item.amount],
      });
    }
  }
  lines.push({
    id: `${prefix}-net`,
    kind: "subtotal",
    label: "Net",
    amounts: [net],
  });
  return lines;
}

export function buildCashFlowLines(cf: CashFlowSummary): FinancialReportLine[] {
  return [
    {
      id: "opening",
      kind: "item",
      label: "Opening cash",
      amounts: [cf.openingCash],
    },
    ...cashFlowBlock("op", "Operating activities", cf.operating, cf.netOperating),
    ...cashFlowBlock("inv", "Investing activities", cf.investing, cf.netInvesting),
    ...cashFlowBlock("fin", "Financing activities", cf.financing, cf.netFinancing),
    {
      id: "net-change",
      kind: "subtotal",
      label: "Net change in cash",
      amounts: [cf.netChange],
    },
    {
      id: "closing",
      kind: "grand-total",
      label: "Closing cash",
      amounts: [cf.closingCash],
    },
  ];
}

export function buildRatiosLines(
  ratios: FinancialRatios & {
    debtRegister: { activeCount: number; totalOwed: number; dueWithin90Days: number };
  }
): FinancialReportLine[] {
  return [
    {
      id: "cr",
      kind: "item",
      label: "Current ratio",
      amounts: [ratios.currentRatio],
      format: "ratio",
    },
    {
      id: "qr",
      kind: "item",
      label: "Quick ratio",
      amounts: [ratios.quickRatio],
      format: "ratio",
    },
    {
      id: "dte",
      kind: "item",
      label: "Debt to equity",
      amounts: [ratios.debtToEquity],
      format: "ratio",
    },
    {
      id: "gm",
      kind: "item",
      label: "Gross margin",
      amounts: [ratios.grossMarginPct],
      format: "percent",
    },
    {
      id: "nm",
      kind: "item",
      label: "Net margin",
      amounts: [ratios.netMarginPct],
      format: "percent",
    },
    { id: "gp", kind: "item", label: "Gross profit", amounts: [ratios.grossProfit] },
    { id: "ni", kind: "item", label: "Net income", amounts: [ratios.netIncome] },
    { id: "rev", kind: "item", label: "Revenue", amounts: [ratios.revenue] },
    { id: "td", kind: "item", label: "GL liabilities", amounts: [ratios.totalDebt] },
    { id: "te", kind: "item", label: "GL equity", amounts: [ratios.totalEquity] },
    {
      id: "dr",
      kind: "item",
      label: "Debt register outstanding",
      amounts: [ratios.debtRegister.totalOwed],
    },
  ];
}

export function ratiosReportFooter(debtRegister: {
  activeCount: number;
  dueWithin90Days: number;
}): string {
  return `Debt register: ${debtRegister.activeCount} active · ${debtRegister.dueWithin90Days} due within 90 days · Confidential · Cosy Aura accounting`;
}

export function buildTrialBalanceLines(trial: {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
}): FinancialReportLine[] {
  const lines: FinancialReportLine[] = trial.rows.map((r) => ({
    id: `tb-${r.code}`,
    kind: "item" as const,
    label: `${r.code} — ${r.name}`,
    amounts: [r.debit > 0 ? r.debit : null, r.credit > 0 ? r.credit : null],
  }));

  lines.push({
    id: "tb-totals",
    kind: "grand-total",
    label: "Totals",
    amounts: [trial.totalDebit, trial.totalCredit],
  });

  if (trial.totalDebit !== trial.totalCredit) {
    lines.push({
      id: "tb-note",
      kind: "note",
      label: "Trial balance is out of balance — review journal entries.",
      amounts: [null, null],
    });
  }

  return lines;
}
