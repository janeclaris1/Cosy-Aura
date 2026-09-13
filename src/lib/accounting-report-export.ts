import {
  FINANCIAL_REPORT_COMPANY,
  FINANCIAL_REPORT_CURRENCY,
  formatReportPeriodLabel,
} from "@/lib/accounting-report-format";
import {
  buildBalanceSheetLines,
  buildCashFlowLines,
  buildProfitAndLossLines,
  buildRatiosLines,
  buildTrialBalanceLines,
  buildTrendLines,
  type FinancialReportLine,
} from "@/lib/accounting-report-lines";
import type {
  BalanceSheetSummary,
  CashFlowSummary,
  FinancialRatios,
  PlSummary,
  PlTrendPoint,
  TrialBalanceRow,
} from "@/lib/accounting-reports-types";
import type { AccountingReportExportId } from "@/lib/accounting-report-export-url";

export type { AccountingReportExportId };

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function row(cells: unknown[]): string {
  return cells.map(csvEscape).join(",");
}

function documentHeader(report: AccountingReportExportId, month: string, country: string) {
  return [
    row(["company", FINANCIAL_REPORT_COMPANY]),
    row(["currency", FINANCIAL_REPORT_CURRENCY]),
    row(["report", report]),
    row(["month", month]),
    row(["country", country]),
    row(["generated_at", new Date().toISOString()]),
    "",
  ];
}

function formatExportAmount(value: number | null | undefined, format?: FinancialReportLine["format"]) {
  if (value == null) return "";
  if (format === "ratio") return value.toFixed(2);
  if (format === "percent") return `${value.toFixed(2)}%`;
  return value.toFixed(2);
}

function linesToCsv(columnLabels: string[], lines: FinancialReportLine[]): string[] {
  const out = [row(["line_kind", "label", ...columnLabels])];
  for (const line of lines) {
    if (line.kind === "note") {
      out.push(row(["note", line.label, ...columnLabels.map(() => "")]));
      continue;
    }
    const amounts = columnLabels.map((_, idx) =>
      formatExportAmount(line.amounts[idx], line.format)
    );
    out.push(row([line.kind, line.label, ...amounts]));
  }
  return out;
}

export function profitAndLossToCsv(
  month: string,
  country: string,
  pl: PlSummary
): string {
  const columnLabels = [formatReportPeriodLabel(month)];
  const lines = buildProfitAndLossLines(pl);
  return [...documentHeader("pl", month, country), ...linesToCsv(columnLabels, lines)].join("\n");
}

export function profitAndLossTrendToCsv(
  endMonth: string,
  country: string,
  months: PlTrendPoint[]
): string {
  const { columnLabels, lines } = buildTrendLines(months);
  return [
    ...documentHeader("trend", endMonth, country),
    ...linesToCsv(columnLabels, lines),
  ].join("\n");
}

export function balanceSheetToCsv(
  month: string,
  country: string,
  balance: BalanceSheetSummary
): string {
  const columnLabels = [formatReportPeriodLabel(month, "as-of")];
  const lines = buildBalanceSheetLines(balance);
  return [
    ...documentHeader("balance", month, country),
    row(["balanced", balance.balanced ? "yes" : "no"]),
    ...linesToCsv(columnLabels, lines),
  ].join("\n");
}

export function cashFlowToCsv(
  month: string,
  country: string,
  cashflow: CashFlowSummary
): string {
  const columnLabels = [formatReportPeriodLabel(month)];
  const lines = buildCashFlowLines(cashflow);
  return [
    ...documentHeader("cashflow", month, country),
    ...linesToCsv(columnLabels, lines),
  ].join("\n");
}

export type RatiosExportPayload = FinancialRatios & {
  debtRegister: {
    activeCount: number;
    totalOwed: number;
    dueWithin90Days: number;
  };
};

export function financialRatiosToCsv(
  month: string,
  country: string,
  ratios: RatiosExportPayload
): string {
  const columnLabels = [formatReportPeriodLabel(month)];
  const lines = buildRatiosLines(ratios);
  return [
    ...documentHeader("ratios", month, country),
    ...linesToCsv(columnLabels, lines),
  ].join("\n");
}

export function trialBalanceToCsv(
  month: string,
  country: string,
  trial: { totalDebit: number; totalCredit: number; rows: TrialBalanceRow[] }
): string {
  const columnLabels = ["Debit (GHS)", "Credit (GHS)"];
  const lines = buildTrialBalanceLines(trial);
  return [
    ...documentHeader("trial", month, country),
    ...linesToCsv(columnLabels, lines),
  ].join("\n");
}

export function accountingReportFilename(
  report: AccountingReportExportId,
  month: string,
  trendMonths?: number
): string {
  if (report === "trend" && trendMonths) {
    return `accounting-trend-${month}-${trendMonths}mo.csv`;
  }
  return `accounting-${report}-${month}.csv`;
}

export function reportDocumentToCsv(doc: {
  report: AccountingReportExportId;
  month: string;
  compareMonth: string | null;
  columnLabels: string[];
  lines: FinancialReportLine[];
}): string {
  const parts = [
    ...documentHeader(doc.report, doc.month, "GH"),
    ...(doc.compareMonth ? [row(["compare_month", doc.compareMonth])] : []),
    ...linesToCsv(doc.columnLabels, doc.lines),
  ];
  return parts.join("\n");
}

export {
  accountingReportExportUrl,
  accountingReportPdfUrl,
  accountingYearEndPackUrl,
} from "@/lib/accounting-report-export-url";
