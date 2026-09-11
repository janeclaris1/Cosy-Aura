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
import { attendanceAbsenceExportUrl } from "@/lib/attendance-report-client";
import { readAdminBranchCookie } from "@/lib/admin-context";
import { cn } from "@/lib/utils";

type Branch = { id: string; name: string; country: string; isDefault?: boolean };

type AbsenceRow = {
  month: string;
  userId: string;
  staffName: string;
  staffEmail: string;
  branches: string;
  workingDays: number;
  presentDays: number;
  absentDays: number;
};

function defaultMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export function AttendanceAbsenceReport() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [allBranches, setAllBranches] = useState(true);
  const [month, setMonth] = useState(defaultMonth);
  const [rows, setRows] = useState<AbsenceRow[]>([]);
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
      const params = new URLSearchParams({ month });
      if (!allBranches && branchId) params.set("branchId", branchId);
      const res = await fetch(`/api/admin/attendance/absences?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load absence report");
      setRows(data.rows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load absence report");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [allBranches, branchId, month]);

  useEffect(() => {
    if (allBranches || branchId) void load();
  }, [allBranches, branchId, load]);

  const exportHref = attendanceAbsenceExportUrl({
    month,
    branchId: allBranches ? undefined : branchId || undefined,
  });

  const totalAbsences = rows.reduce((n, r) => n + r.absentDays, 0);

  return (
    <AdminCard className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <AdminSectionTitle
          title="Monthly absences"
          description="Count of days each employee did not clock in. Based on Mon–Sat working days up to today in the month."
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

      <div className="grid sm:grid-cols-2 gap-3 pt-1 border-t border-stone-100">
        <label className="block">
          <span className={adminLabelClass}>Month</span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className={cn(adminInputClass, "rounded-xl")}
          />
        </label>
        <label className="block">
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

      {rows.length > 0 ? (
        <p className="text-sm font-roboto text-mocha">
          {formatMonthLabel(month)} · {totalAbsences} total absence
          {totalAbsences === 1 ? "" : "s"} across {rows.length} staff record
          {rows.length === 1 ? "" : "s"}
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl ring-1 ring-black/[0.04]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm font-roboto">
            <thead>
              <tr className="border-b border-stone-100 bg-[#fafafa]/80">
                {["Employee", "Branch", "Working days", "Present", "Absences"].map(
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
                  <td colSpan={5} className="px-4 py-12 text-center text-mocha">
                    Loading…
                  </td>
                </tr>
              ) : null}
              {!loading && !rows.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-mocha">
                    No staff records for this month.
                  </td>
                </tr>
              ) : null}
              {rows.map((row) => (
                <tr key={`${row.month}-${row.userId}`} className="hover:bg-[#fafafa]/70">
                  <td className="px-4 py-3 min-w-[10rem]">
                    <p className="font-medium text-espresso">{row.staffName}</p>
                    <p className="text-[11px] text-mocha">{row.staffEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-mocha max-w-[12rem]">
                    <span className="line-clamp-2">{row.branches || "—"}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-mocha">{row.workingDays}</td>
                  <td className="px-4 py-3 tabular-nums text-emerald-700">{row.presentDays}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex min-w-[2rem] justify-center rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ring-1",
                        row.absentDays > 0
                          ? "bg-red-50 text-red-700 ring-red-200/80"
                          : "bg-emerald-50 text-emerald-800 ring-emerald-200/80"
                      )}
                    >
                      {row.absentDays}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminCard>
  );
}
