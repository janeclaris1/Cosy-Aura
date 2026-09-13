import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import {
  accountingReportFilename,
  reportDocumentToCsv,
} from "@/lib/accounting-report-export";
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

  const report = reportRaw as AccountingReportExportId;

  try {
    const document = await loadReportDocument({
      report,
      month,
      compareMonth,
      trendMonths,
    });
    const csv = reportDocumentToCsv(document);
    const filename = accountingReportFilename(report, month, trendMonths);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("[accounting/reports/export]", report, e);
    const message = e instanceof Error ? e.message : "Failed to export report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
