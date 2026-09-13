"use client";

import {
  FINANCIAL_REPORT_COMPANY,
  FINANCIAL_REPORT_CURRENCY,
  formatReportAmount,
  formatReportPeriodLabel,
} from "@/lib/accounting-report-format";
import type { FinancialReportLine } from "@/lib/accounting-report-lines";
import { cn } from "@/lib/utils";

const REPORT_TITLES = {
  pl: "Profit & Loss Statement",
  trend: "Profit & Loss Trends",
  balance: "Balance Sheet",
  cashflow: "Cash Flow Statement",
  ratios: "Financial Ratios",
  trial: "Trial Balance",
} as const;

export type FinancialReportId = keyof typeof REPORT_TITLES;

function amountCell(
  value: number | null | undefined,
  format: FinancialReportLine["format"] = "currency"
) {
  if (value == null) return "–";
  if (format === "ratio") return value.toFixed(2);
  if (format === "percent") return `${value.toFixed(2)}%`;
  return formatReportAmount(value);
}

function lineClass(kind: FinancialReportLine["kind"]) {
  return cn(
    "fin-report-row",
    kind === "section" && "fin-report-row--section",
    kind === "subsection" && "fin-report-row--subsection",
    kind === "item" && "fin-report-row--item",
    kind === "subtotal" && "fin-report-row--subtotal",
    kind === "total" && "fin-report-row--total",
    kind === "grand-total" && "fin-report-row--grand-total",
    kind === "note" && "fin-report-row--note"
  );
}

export function FinancialReportHeader({
  report,
  month,
  trendMonths,
}: {
  report: FinancialReportId;
  month: string;
  trendMonths?: number;
}) {
  const period =
    report === "trend" && trendMonths
      ? `${trendMonths} months ending ${formatReportPeriodLabel(month)}`
      : report === "balance"
        ? formatReportPeriodLabel(month, "as-of")
        : formatReportPeriodLabel(month);

  return (
    <header className="fin-report-header">
      <h1 className="fin-report-title">{REPORT_TITLES[report]}</h1>
      <p className="fin-report-company">{FINANCIAL_REPORT_COMPANY}</p>
      <p className="fin-report-currency">in {FINANCIAL_REPORT_CURRENCY}</p>
      <p className="fin-report-period">{period}</p>
    </header>
  );
}

export function FinancialReportTable({
  lines,
  columnLabels,
}: {
  lines: FinancialReportLine[];
  columnLabels: string[];
}) {
  const filtered = lines.filter((line) => line.kind !== "header-row");

  return (
    <table className="fin-report-table">
      <thead>
        <tr>
          <th className="fin-report-th fin-report-th--label" />
          {columnLabels.map((label) => (
            <th key={label} className="fin-report-th fin-report-th--amount">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filtered.map((line) => {
          if (line.kind === "note") {
            return (
              <tr key={line.id} className={lineClass(line.kind)}>
                <td colSpan={columnLabels.length + 1}>{line.label}</td>
              </tr>
            );
          }

          const showAmounts =
            line.kind === "item" ||
            line.kind === "subtotal" ||
            line.kind === "total" ||
            line.kind === "grand-total";

          return (
            <tr key={line.id} className={lineClass(line.kind)}>
              <td className="fin-report-label">{line.label}</td>
              {columnLabels.map((col, idx) => (
                <td key={`${line.id}-${col}`} className="fin-report-amount">
                  {showAmounts ? amountCell(line.amounts[idx], line.format) : ""}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function FinancialReportDocument({
  report,
  month,
  trendMonths,
  columnLabels,
  lines,
  footer,
  wide = false,
}: {
  report: FinancialReportId;
  month: string;
  trendMonths?: number;
  columnLabels: string[];
  lines: FinancialReportLine[];
  footer?: string;
  wide?: boolean;
}) {
  return (
    <div className={cn("fin-report", wide && "fin-report--wide")}>
      <FinancialReportHeader report={report} month={month} trendMonths={trendMonths} />
      <FinancialReportTable lines={lines} columnLabels={columnLabels} />
      {footer ? <p className="fin-report-footer">{footer}</p> : null}
    </div>
  );
}
