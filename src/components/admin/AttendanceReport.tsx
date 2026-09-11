"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminSectionTitle,
  adminInputClass,
  adminLabelClass,
} from "@/components/admin/admin-ui";
import { AdminBranchSelect } from "@/components/admin/AdminBranchSelect";
import { attendanceReportExportUrl } from "@/lib/attendance-report-client";
import { readAdminBranchCookie } from "@/lib/admin-context";
import { cn } from "@/lib/utils";

type Branch = { id: string; name: string; country: string; isDefault?: boolean };

type ReportRow = {
  id: string;
  dayKey: string;
  punchedAt: string;
  staffName: string;
  staffEmail: string;
  branchName: string;
  branchCountry: string;
  punchType: string;
  source: string;
  deviceName: string | null;
  note: string | null;
  recordedBy: string | null;
};

type Summary = {
  totalPunches: number;
  uniqueStaff: number;
  clockIns: number;
  clockOuts: number;
};

function defaultFromDay() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultToDay() {
  return new Date().toISOString().slice(0, 10);
}

function formatPunchTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function punchLabel(type: string) {
  return type === "CLOCK_IN" ? "Clock in" : "Clock out";
}

export function AttendanceReport() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [allBranches, setAllBranches] = useState(true);
  const [fromDay, setFromDay] = useState(defaultFromDay);
  const [toDay, setToDay] = useState(defaultToDay);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/context")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const list = (data?.branches || []) as Branch[];
        setBranches(list);
        const saved = readAdminBranchCookie();
        const pick =
          (saved && list.some((b) => b.id === saved) && saved) ||
          list.find((b) => b.isDefault)?.id ||
          list[0]?.id ||
          "";
        setBranchId(pick);
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from: fromDay, to: toDay });
      if (!allBranches && branchId) params.set("branchId", branchId);
      const res = await fetch(`/api/admin/attendance/report?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load report");
      setRows(data.rows || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load report");
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [allBranches, branchId, fromDay, toDay]);

  useEffect(() => {
    if (allBranches || branchId) void load();
  }, [allBranches, branchId, load]);

  const exportHref = attendanceReportExportUrl({
    from: fromDay,
    to: toDay,
    branchId: allBranches ? undefined : branchId || undefined,
  });

  return (
    <AdminCard className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <AdminSectionTitle
          title="Attendance report"
          description="All staff clock-in and clock-out events across your branches. Export to CSV for payroll or audits."
          className="!mb-0"
        />
        <div className="flex flex-wrap gap-2 shrink-0">
          <AdminButton
            type="button"
            variant="secondary"
            onClick={() => void load()}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </AdminButton>
          <AdminButton href={exportHref} variant="primary" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </AdminButton>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-stone-100">
        <label className="block">
          <span className={adminLabelClass}>From</span>
          <input
            type="date"
            value={fromDay}
            onChange={(e) => setFromDay(e.target.value)}
            className={cn(adminInputClass, "rounded-xl")}
          />
        </label>
        <label className="block">
          <span className={adminLabelClass}>To</span>
          <input
            type="date"
            value={toDay}
            onChange={(e) => setToDay(e.target.value)}
            className={cn(adminInputClass, "rounded-xl")}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={adminLabelClass}>Branch</span>
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="inline-flex items-center gap-2 text-sm font-roboto text-espresso shrink-0 px-1">
              <input
                type="checkbox"
                checked={allBranches}
                onChange={(e) => setAllBranches(e.target.checked)}
              />
              All branches
            </label>
            {!allBranches && branches.length ? (
              <AdminBranchSelect
                branches={branches}
                value={branchId}
                onChange={setBranchId}
                label=""
                hideWhenSingle={false}
                className="flex-1"
              />
            ) : null}
          </div>
        </label>
      </div>

      {summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-stone-200/60 rounded-2xl overflow-hidden ring-1 ring-black/[0.04]">
          {[
            { label: "Punches", value: summary.totalPunches },
            { label: "Staff", value: summary.uniqueStaff },
            { label: "Clock ins", value: summary.clockIns },
            { label: "Clock outs", value: summary.clockOuts },
          ].map((tile) => (
            <div key={tile.label} className="bg-white px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-mocha">
                {tile.label}
              </p>
              <p className="font-playfair text-2xl text-[#03045e] mt-1 tabular-nums">
                {tile.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl ring-1 ring-black/[0.04]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm font-roboto">
            <thead>
              <tr className="border-b border-stone-100 bg-[#fafafa]/80">
                {["Date", "Time", "Staff", "Branch", "Event", "Source", "Device"].map(
                  (label) => (
                    <th
                      key={label}
                      className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-mocha"
                    >
                      {label}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {loading && !rows.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-mocha">
                    Loading report…
                  </td>
                </tr>
              ) : null}
              {!loading && !rows.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-mocha">
                    No attendance records for this period.
                  </td>
                </tr>
              ) : null}
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-[#fafafa]/70 transition-colors">
                  <td className="px-4 py-3 text-xs text-mocha tabular-nums whitespace-nowrap">
                    {row.dayKey}
                  </td>
                  <td className="px-4 py-3 text-xs text-espresso whitespace-nowrap">
                    {formatPunchTime(row.punchedAt)}
                  </td>
                  <td className="px-4 py-3 min-w-[10rem]">
                    <p className="font-medium text-espresso truncate">{row.staffName}</p>
                    <p className="text-[11px] text-mocha truncate">{row.staffEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-mocha max-w-[9rem]">
                    <span className="line-clamp-2">{row.branchName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ring-1",
                        row.punchType === "CLOCK_IN"
                          ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80"
                          : "bg-stone-100 text-stone-700 ring-stone-200/80"
                      )}
                    >
                      {punchLabel(row.punchType)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-mocha capitalize">
                    {row.source.toLowerCase()}
                    {row.recordedBy ? (
                      <span className="block text-[11px] mt-0.5">by {row.recordedBy}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-mocha">
                    {row.deviceName || "—"}
                    {row.note ? (
                      <span className="block text-[11px] mt-0.5 line-clamp-2">{row.note}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 0 ? (
          <div className="border-t border-stone-100 bg-[#fafafa]/50 px-4 py-2.5 text-xs text-mocha">
            Showing {rows.length} punch{rows.length === 1 ? "" : "es"}
          </div>
        ) : null}
      </div>
    </AdminCard>
  );
}
