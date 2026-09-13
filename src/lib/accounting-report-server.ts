import "server-only";

import type { AccountingReportExportId } from "@/lib/accounting-report-export-url";
import { formatReportPeriodLabel } from "@/lib/accounting-report-format";
import { mergeReportLines } from "@/lib/accounting-report-compare";
import {
  buildBalanceSheetLines,
  buildCashFlowLines,
  buildProfitAndLossLines,
  buildRatiosLines,
  buildTrialBalanceLines,
  buildTrendLines,
  ratiosReportFooter,
  type FinancialReportLine,
} from "@/lib/accounting-report-lines";
import {
  balanceSheetAsOf,
  cashFlowForMonth,
  debtRegisterSummary,
  financialRatiosForMonth,
  profitAndLossForMonth,
  profitAndLossTrend,
  trialBalanceForMonth,
} from "@/lib/accounting-reports";
import { GH_ACCOUNTING_COUNTRY } from "@/lib/accounting-gh-coa";

export type LoadedReportDocument = {
  report: AccountingReportExportId;
  month: string;
  compareMonth: string | null;
  columnLabels: string[];
  lines: FinancialReportLine[];
  footer: string;
  trendMonths?: number;
  wide: boolean;
};

export async function loadReportDocument(input: {
  report: AccountingReportExportId;
  month: string;
  compareMonth?: string | null;
  trendMonths?: number;
}): Promise<LoadedReportDocument> {
  const { report, month, compareMonth = null, trendMonths = 6 } = input;
  const compare = compareMonth && compareMonth !== month ? compareMonth : null;

  if (report === "trend") {
    const { months } = await profitAndLossTrend(month, trendMonths, GH_ACCOUNTING_COUNTRY);
    const built = buildTrendLines(months);
    return {
      report,
      month,
      compareMonth: null,
      columnLabels: built.columnLabels,
      lines: built.lines,
      footer: "Confidential · Cosy Aura accounting",
      trendMonths,
      wide: built.columnLabels.length > 3,
    };
  }

  const primaryLabel =
    report === "balance"
      ? formatReportPeriodLabel(month, "as-of")
      : formatReportPeriodLabel(month);
  const compareLabel = compare
    ? report === "balance"
      ? formatReportPeriodLabel(compare, "as-of")
      : formatReportPeriodLabel(compare)
    : null;

  let lines: FinancialReportLine[] = [];
  let footer = "Confidential · Cosy Aura accounting";

  switch (report) {
    case "pl": {
      const pl = await profitAndLossForMonth(month, GH_ACCOUNTING_COUNTRY);
      lines = buildProfitAndLossLines(pl);
      if (compare) {
        const plCmp = await profitAndLossForMonth(compare, GH_ACCOUNTING_COUNTRY);
        lines = mergeReportLines(lines, buildProfitAndLossLines(plCmp));
      }
      break;
    }
    case "balance": {
      const balance = await balanceSheetAsOf(month, GH_ACCOUNTING_COUNTRY);
      lines = buildBalanceSheetLines(balance);
      if (compare) {
        const balanceCmp = await balanceSheetAsOf(compare, GH_ACCOUNTING_COUNTRY);
        lines = mergeReportLines(lines, buildBalanceSheetLines(balanceCmp));
      }
      break;
    }
    case "cashflow": {
      const cashflow = await cashFlowForMonth(month, GH_ACCOUNTING_COUNTRY);
      lines = buildCashFlowLines(cashflow);
      if (compare) {
        const cfCmp = await cashFlowForMonth(compare, GH_ACCOUNTING_COUNTRY);
        lines = mergeReportLines(lines, buildCashFlowLines(cfCmp));
      }
      break;
    }
    case "ratios": {
      const ratios = await financialRatiosForMonth(month, GH_ACCOUNTING_COUNTRY);
      const debts = await debtRegisterSummary(GH_ACCOUNTING_COUNTRY);
      const payload = {
        ...ratios,
        month,
        debtRegister: {
          activeCount: debts.activeCount,
          totalOwed: debts.totalOwed,
          dueWithin90Days: debts.dueWithin90Days,
        },
      };
      lines = buildRatiosLines(payload);
      footer = ratiosReportFooter(payload.debtRegister);
      if (compare) {
        const ratiosCmp = await financialRatiosForMonth(compare, GH_ACCOUNTING_COUNTRY);
        const debtsCmp = await debtRegisterSummary(GH_ACCOUNTING_COUNTRY);
        lines = mergeReportLines(
          lines,
          buildRatiosLines({
            ...ratiosCmp,
            month: compare,
            debtRegister: {
              activeCount: debtsCmp.activeCount,
              totalOwed: debtsCmp.totalOwed,
              dueWithin90Days: debtsCmp.dueWithin90Days,
            },
          })
        );
      }
      break;
    }
    case "trial": {
      const trial = await trialBalanceForMonth(month, GH_ACCOUNTING_COUNTRY);
      if (!compare) {
        lines = buildTrialBalanceLines(trial);
      } else {
        const trialCmp = await trialBalanceForMonth(compare, GH_ACCOUNTING_COUNTRY);
        const codes = new Set([
          ...trial.rows.map((r) => r.code),
          ...trialCmp.rows.map((r) => r.code),
        ]);
        const primaryMap = new Map(trial.rows.map((r) => [r.code, r]));
        const cmpMap = new Map(trialCmp.rows.map((r) => [r.code, r]));
        lines = [...codes].sort().map((code) => {
          const a = primaryMap.get(code);
          const b = cmpMap.get(code);
          const label = a
            ? `${a.code} — ${a.name}`
            : b
              ? `${b.code} — ${b.name}`
              : code;
          return {
            id: `tb-${code}`,
            kind: "item" as const,
            label,
            amounts: [
              a && a.debit > 0 ? a.debit : null,
              a && a.credit > 0 ? a.credit : null,
              b && b.debit > 0 ? b.debit : null,
              b && b.credit > 0 ? b.credit : null,
            ],
          };
        });
        lines.push({
          id: "tb-totals",
          kind: "grand-total",
          label: "Totals",
          amounts: [
            trial.totalDebit,
            trial.totalCredit,
            trialCmp.totalDebit,
            trialCmp.totalCredit,
          ],
        });
      }
      break;
    }
  }

  const columnLabels =
    report === "trial"
      ? compare
        ? [`Debit (${primaryLabel})`, `Credit (${primaryLabel})`, `Debit (${compareLabel})`, `Credit (${compareLabel})`]
        : ["Debit", "Credit"]
      : compareLabel
        ? [primaryLabel, compareLabel]
        : [primaryLabel];

  return {
    report,
    month,
    compareMonth: compare,
    columnLabels,
    lines,
    footer,
    wide: columnLabels.length > 3,
  };
}
