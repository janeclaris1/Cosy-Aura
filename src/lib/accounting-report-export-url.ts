/** Client-safe export URL helpers (no server / Prisma imports). */

import type { CompareMode } from "@/lib/accounting-report-compare";
import { resolveCompareMonth } from "@/lib/accounting-report-compare";

export type AccountingReportExportId =
  | "pl"
  | "trend"
  | "balance"
  | "cashflow"
  | "ratios"
  | "trial";

function reportQueryParams(input: {
  report: AccountingReportExportId;
  month: string;
  trendMonths?: number;
  compareMode?: CompareMode;
}) {
  const qs = new URLSearchParams({
    report: input.report,
    month: input.month,
  });
  if (input.report === "trend" && input.trendMonths) {
    qs.set("months", String(input.trendMonths));
  }
  const compareMonth = resolveCompareMonth(input.month, input.compareMode ?? "none");
  if (compareMonth) qs.set("compareMonth", compareMonth);
  return qs;
}

export function accountingReportExportUrl(input: {
  report: AccountingReportExportId;
  month: string;
  trendMonths?: number;
  compareMode?: CompareMode;
}): string {
  return `/api/admin/accounting/reports/export?${reportQueryParams(input).toString()}`;
}

export function accountingReportPdfUrl(input: {
  report: AccountingReportExportId;
  month: string;
  trendMonths?: number;
  compareMode?: CompareMode;
}): string {
  return `/api/admin/accounting/reports/pdf?${reportQueryParams(input).toString()}`;
}

export function accountingReportDocumentUrl(input: {
  report: AccountingReportExportId;
  month: string;
  trendMonths?: number;
  compareMode?: CompareMode;
}): string {
  return `/api/admin/accounting/reports/document?${reportQueryParams(input).toString()}`;
}

export function accountingYearEndPackUrl(input: {
  year: number;
  format: "pdf" | "csv";
}): string {
  const qs = new URLSearchParams({
    year: String(input.year),
    format: input.format,
  });
  return `/api/admin/accounting/reports/pack?${qs.toString()}`;
}
