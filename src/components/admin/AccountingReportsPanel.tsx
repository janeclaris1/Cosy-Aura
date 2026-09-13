"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, Package, Printer, RefreshCw } from "lucide-react";
import "@/components/admin/financial-report.css";
import {
  FinancialReportDocument,
  type FinancialReportId,
} from "@/components/admin/FinancialReportDocument";
import {
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminTabBar,
  adminInputClass,
  adminLabelClass,
  adminSelectClass,
} from "@/components/admin/admin-ui";
import type { CompareMode } from "@/lib/accounting-report-compare";
import { supportsComparison } from "@/lib/accounting-report-compare";
import {
  accountingReportDocumentUrl,
  accountingReportExportUrl,
  accountingReportPdfUrl,
  accountingYearEndPackUrl,
} from "@/lib/accounting-report-export-url";
import type { FinancialReportLine } from "@/lib/accounting-report-lines";
import { printAccountingReport } from "@/lib/accounting-report-print";
import { readAdminJson } from "@/lib/admin-fetch";

type ReportId = FinancialReportId;

type LoadedReportDocument = {
  report: ReportId;
  month: string;
  compareMonth: string | null;
  columnLabels: string[];
  lines: FinancialReportLine[];
  footer: string;
  trendMonths?: number;
  wide: boolean;
};

const REPORT_TABS: { id: ReportId; label: string }[] = [
  { id: "pl", label: "P&L" },
  { id: "trend", label: "Trends" },
  { id: "balance", label: "Balance sheet" },
  { id: "cashflow", label: "Cash flow" },
  { id: "ratios", label: "Ratios" },
  { id: "trial", label: "Trial balance" },
];

const COMPARE_OPTIONS: { id: CompareMode; label: string }[] = [
  { id: "none", label: "No comparison" },
  { id: "prior_month", label: "Prior month" },
  { id: "prior_year", label: "Prior year" },
];

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function AccountingReportsPanel() {
  const printRootRef = useRef<HTMLDivElement>(null);
  const [month, setMonth] = useState(currentMonthKey());
  const [view, setView] = useState<ReportId>("pl");
  const [trendMonths, setTrendMonths] = useState(6);
  const [compareMode, setCompareMode] = useState<CompareMode>("none");
  const [packYear, setPackYear] = useState(() => new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [document, setDocument] = useState<LoadedReportDocument | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const res = await readAdminJson<LoadedReportDocument>(
      await fetch(
        accountingReportDocumentUrl({
          report: view,
          month,
          trendMonths: view === "trend" ? trendMonths : undefined,
          compareMode: supportsComparison(view) ? compareMode : "none",
        })
      )
    );

    if (!res.ok) {
      setError(res.error);
      setDocument(null);
    } else {
      setDocument(res.data);
    }
    setLoading(false);
  }, [month, view, trendMonths, compareMode]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (view === "trend") setCompareMode("none");
  }, [view]);

  const exportParams = {
    report: view,
    month,
    trendMonths: view === "trend" ? trendMonths : undefined,
    compareMode: supportsComparison(view) ? compareMode : ("none" as CompareMode),
  };

  const exportHref = accountingReportExportUrl(exportParams);
  const pdfHref = accountingReportPdfUrl(exportParams);
  const yearEndPdfHref = accountingYearEndPackUrl({ year: packYear, format: "pdf" });
  const yearEndCsvHref = accountingYearEndPackUrl({ year: packYear, format: "csv" });

  const hasReportData = !loading && !error && document && document.lines.length > 0;

  return (
    <div className="space-y-4">
      <div className="print:hidden flex flex-wrap items-end gap-3">
        <div>
          <label className={adminLabelClass}>
            {view === "trend" ? "End month" : "Month"}
          </label>
          <input
            type="month"
            className={adminInputClass}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        {view === "trend" ? (
          <div>
            <label className={adminLabelClass}>Months</label>
            <select
              className={adminInputClass}
              value={trendMonths}
              onChange={(e) => setTrendMonths(Number(e.target.value))}
            >
              {[3, 6, 12, 24].map((n) => (
                <option key={n} value={n}>
                  {n} months
                </option>
              ))}
            </select>
          </div>
        ) : supportsComparison(view) ? (
          <div>
            <label className={adminLabelClass}>Compare</label>
            <select
              className={adminSelectClass}
              value={compareMode}
              onChange={(e) => setCompareMode(e.target.value as CompareMode)}
            >
              {COMPARE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <AdminTabBar tabs={REPORT_TABS} value={view} onChange={setView} size="sm" />
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <div
            className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200/80 bg-white/60 px-3 py-1.5"
            title="Full-year bundle: 12-month P&L trend, December P&L, balance sheet, cash flow, ratios, and trial balance."
          >
            <Package className="w-4 h-4 text-[#03045e] shrink-0" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-mocha whitespace-nowrap">
              Year-end
            </span>
            <input
              type="number"
              min={2000}
              max={2100}
              className={`${adminInputClass} w-[4.5rem] py-1.5`}
              value={packYear}
              onChange={(e) => setPackYear(Number(e.target.value))}
              aria-label="Year-end pack year"
            />
            <AdminButton href={yearEndPdfHref} variant="secondary" className="gap-2">
              <FileText className="w-4 h-4" />
              Year-end PDF
            </AdminButton>
            <AdminButton href={yearEndCsvHref} variant="secondary" className="gap-2">
              <Download className="w-4 h-4" />
              Year-end CSV
            </AdminButton>
          </div>
          <span className="hidden lg:block w-px h-6 bg-stone-200 shrink-0" aria-hidden="true" />
          <AdminButton type="button" variant="secondary" onClick={() => void load()}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </AdminButton>
          {loading ? (
            <>
              <AdminButton type="button" variant="secondary" className="gap-2" disabled>
                <Download className="w-4 h-4" />
                CSV
              </AdminButton>
              <AdminButton type="button" variant="secondary" className="gap-2" disabled>
                <FileText className="w-4 h-4" />
                PDF
              </AdminButton>
            </>
          ) : (
            <>
              <AdminButton href={exportHref} variant="secondary" className="gap-2">
                <Download className="w-4 h-4" />
                CSV
              </AdminButton>
              <AdminButton href={pdfHref} variant="secondary" className="gap-2">
                <FileText className="w-4 h-4" />
                PDF
              </AdminButton>
            </>
          )}
          <AdminButton
            type="button"
            variant="secondary"
            className="gap-2"
            disabled={!hasReportData}
            onClick={() => {
              if (printRootRef.current) printAccountingReport(printRootRef.current);
            }}
          >
            <Printer className="w-4 h-4" />
            Print
          </AdminButton>
        </div>
      </div>

      <div ref={printRootRef} className="accounting-report-print-root w-full flex justify-center">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-mocha py-6 w-full">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading report…
          </div>
        ) : error ? (
          <AdminEmptyState message={error} />
        ) : document ? (
          <AdminCard
            className={
              document.wide
                ? "fin-report-shell fin-report-shell--wide overflow-x-auto"
                : "fin-report-shell overflow-x-auto"
            }
          >
            <FinancialReportDocument
              report={document.report}
              month={document.month}
              trendMonths={document.trendMonths}
              columnLabels={document.columnLabels}
              lines={document.lines}
              wide={document.wide}
              footer={document.footer}
            />
          </AdminCard>
        ) : null}
      </div>
    </div>
  );
}
