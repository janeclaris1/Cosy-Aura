import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
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
import { defaultMonthKey } from "@/lib/hr-scope";

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("accounting.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || defaultMonthKey();
  const report = searchParams.get("report") || "pl";
  const trendMonths = Math.min(
    24,
    Math.max(2, Number(searchParams.get("months") || 6))
  );

  try {
  switch (report) {
    case "trial": {
      const trial = await trialBalanceForMonth(month, GH_ACCOUNTING_COUNTRY);
      return NextResponse.json({
        report: "trial",
        month,
        country: GH_ACCOUNTING_COUNTRY,
        ...trial,
      });
    }
    case "balance": {
      const balance = await balanceSheetAsOf(month, GH_ACCOUNTING_COUNTRY);
      return NextResponse.json({
        report: "balance",
        month,
        country: GH_ACCOUNTING_COUNTRY,
        ...balance,
      });
    }
    case "trend": {
      const { months: trendData } = await profitAndLossTrend(
        month,
        trendMonths,
        GH_ACCOUNTING_COUNTRY
      );
      return NextResponse.json({
        report: "trend",
        month,
        trendMonths,
        country: GH_ACCOUNTING_COUNTRY,
        months: trendData,
      });
    }
    case "cashflow": {
      const cashflow = await cashFlowForMonth(month, GH_ACCOUNTING_COUNTRY);
      return NextResponse.json({
        report: "cashflow",
        country: GH_ACCOUNTING_COUNTRY,
        ...cashflow,
      });
    }
    case "ratios": {
      const ratios = await financialRatiosForMonth(month, GH_ACCOUNTING_COUNTRY);
      const debts = await debtRegisterSummary(GH_ACCOUNTING_COUNTRY);
      return NextResponse.json({
        report: "ratios",
        country: GH_ACCOUNTING_COUNTRY,
        ...ratios,
        debtRegister: {
          activeCount: debts.activeCount,
          totalOwed: debts.totalOwed,
          dueWithin90Days: debts.dueWithin90Days,
        },
      });
    }
    default: {
      const pl = await profitAndLossForMonth(month, GH_ACCOUNTING_COUNTRY);
      return NextResponse.json({
        report: "pl",
        month,
        country: GH_ACCOUNTING_COUNTRY,
        ...pl,
      });
    }
  }
  } catch (e) {
    console.error("[accounting/reports]", report, e);
    const message = e instanceof Error ? e.message : "Failed to load report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
