import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { loadReportDocument } from "@/lib/accounting-report-server";
import type { AccountingReportExportId } from "@/lib/accounting-report-export-url";
import { defaultMonthKey } from "@/lib/hr-scope";

const VALID_REPORTS = new Set<AccountingReportExportId>([
  "pl",
  "trend",
  "balance",
  "cashflow",
  "ratios",
  "trial",
]);

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("accounting.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || defaultMonthKey();
  const reportRaw = (searchParams.get("report") || "pl").toLowerCase();
  const compareMonth = searchParams.get("compareMonth") || undefined;
  const trendMonths = Math.min(
    24,
    Math.max(2, Number(searchParams.get("months") || 6))
  );

  if (!VALID_REPORTS.has(reportRaw as AccountingReportExportId)) {
    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }

  try {
    const document = await loadReportDocument({
      report: reportRaw as AccountingReportExportId,
      month,
      compareMonth,
      trendMonths,
    });
    return NextResponse.json(document);
  } catch (e) {
    console.error("[accounting/reports/document]", reportRaw, e);
    const message = e instanceof Error ? e.message : "Failed to load report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
