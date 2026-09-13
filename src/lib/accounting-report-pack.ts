import "server-only";

import {
  balanceSheetToCsv,
  cashFlowToCsv,
  financialRatiosToCsv,
  profitAndLossToCsv,
  profitAndLossTrendToCsv,
  trialBalanceToCsv,
} from "@/lib/accounting-report-export";
import { loadReportDocument } from "@/lib/accounting-report-server";
import { renderReportPackPdf } from "@/lib/accounting-report-pdf";
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

export async function loadYearEndReportDocuments(year: number) {
  const endMonth = `${year}-12`;
  const reports = [
    { report: "trend" as const, trendMonths: 12 },
    { report: "pl" as const },
    { report: "balance" as const },
    { report: "cashflow" as const },
    { report: "ratios" as const },
    { report: "trial" as const },
  ];

  const docs = await Promise.all(
    reports.map((entry) =>
      loadReportDocument({
        report: entry.report,
        month: endMonth,
        trendMonths: entry.trendMonths,
      })
    )
  );

  return { year, endMonth, docs };
}

export async function buildYearEndPackPdf(year: number): Promise<Uint8Array> {
  const { docs } = await loadYearEndReportDocuments(year);
  return renderReportPackPdf(docs, year);
}

export async function buildYearEndPackCsv(year: number): Promise<string> {
  const endMonth = `${year}-12`;
  const country = GH_ACCOUNTING_COUNTRY;

  const [trend, pl, balance, cashflow, ratios, debts, trial] = await Promise.all([
    profitAndLossTrend(endMonth, 12, country),
    profitAndLossForMonth(endMonth, country),
    balanceSheetAsOf(endMonth, country),
    cashFlowForMonth(endMonth, country),
    financialRatiosForMonth(endMonth, country),
    debtRegisterSummary(country),
    trialBalanceForMonth(endMonth, country),
  ]);

  const sections = [
    `# Year-end pack ${year}`,
    profitAndLossTrendToCsv(endMonth, country, trend.months),
    "",
    profitAndLossToCsv(endMonth, country, pl),
    "",
    balanceSheetToCsv(endMonth, country, balance),
    "",
    cashFlowToCsv(endMonth, country, cashflow),
    "",
    financialRatiosToCsv(endMonth, country, {
      ...ratios,
      debtRegister: {
        activeCount: debts.activeCount,
        totalOwed: debts.totalOwed,
        dueWithin90Days: debts.dueWithin90Days,
      },
    }),
    "",
    trialBalanceToCsv(endMonth, country, trial),
  ];

  return sections.join("\n");
}
