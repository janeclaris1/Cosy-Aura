"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  ChevronRight,
  Download,
  Layers,
  Loader2,
  Printer,
  RefreshCw,
  Wallet,
} from "lucide-react";
import {
  AdminButton,
  AdminEmptyState,
  adminInputClass,
  adminLabelClass,
  adminSelectClass,
} from "@/components/admin/admin-ui";
import { readAdminJson } from "@/lib/admin-fetch";
import { payRunStatusLabel } from "@/lib/payroll-gh";
import { StaffAvatar } from "@/components/admin/StaffAvatar";
import { cn, formatPrice } from "@/lib/utils";

type Branch = { id: string; name: string; country: string };

type PayRunSummary = {
  id: string;
  periodLabel: string;
  country: string;
  status: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalEmployerSsnit: number;
  branch: { id: string; name: string } | null;
  _count: { lines: number };
};

type PayRunLine = {
  id: string;
  userId: string;
  basicSalary: number;
  allowances: number;
  grossPay: number;
  paye: number;
  ssnitEmployee: number;
  ssnitEmployer: number;
  totalDeductions: number;
  netPay: number;
  presentDays: number;
  workingDays: number;
  leaveDays: number;
  proRateFactor: number;
  staff: { id: string; name: string | null; email: string; image?: string | null } | null;
  branches?: string[];
};

type PayRunDetail = PayRunSummary & {
  lines: PayRunLine[];
  notes: string | null;
};

const STATUS_META: Record<string, { badge: string; dot: string }> = {
  DRAFT: { badge: "bg-stone-100 text-stone-700 ring-stone-200/80", dot: "bg-stone-400" },
  REVIEW: { badge: "bg-sky-50 text-sky-900 ring-sky-200/80", dot: "bg-sky-500" },
  APPROVED: { badge: "bg-emerald-50 text-emerald-900 ring-emerald-200/80", dot: "bg-emerald-500" },
  PAID: { badge: "bg-[#03045e]/10 text-[#03045e] ring-[#03045e]/15", dot: "bg-[#03045e]" },
  CANCELLED: { badge: "bg-red-50 text-red-800 ring-red-200/80", dot: "bg-red-400" },
};

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function branchLabel(run: Pick<PayRunSummary, "branch">) {
  return run.branch?.name || "All branches (combined)";
}

function employeeLabel(line: PayRunLine) {
  return line.staff?.name || line.staff?.email || "Unknown employee";
}

export function PayrollManager() {
  const [payRuns, setPayRuns] = useState<PayRunSummary[]>([]);
  const [selected, setSelected] = useState<PayRunDetail | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [country, setCountry] = useState("GH");
  const [periodLabel, setPeriodLabel] = useState(currentMonthKey());
  const [branchMode, setBranchMode] = useState<"combined" | "single" | "each">("combined");
  const [branchId, setBranchId] = useState("");
  const [listFilter, setListFilter] = useState<"all" | "combined" | "branch">("all");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const countryBranches = useMemo(
    () => branches.filter((b) => b.country === country),
    [branches, country]
  );

  const filteredRuns = useMemo(() => {
    if (listFilter === "combined") {
      return payRuns.filter((r) => !r.branch);
    }
    if (listFilter === "branch") {
      return payRuns.filter((r) => r.branch);
    }
    return payRuns;
  }, [payRuns, listFilter]);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/hr/payroll?country=${encodeURIComponent(country)}`
      );
      const result = await readAdminJson<{ payRuns?: PayRunSummary[] }>(res);
      if (!result.ok) throw new Error(result.error);
      setPayRuns(result.data.payRuns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [country]);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/hr/payroll/${id}`);
    const result = await readAdminJson<{ payRun?: PayRunDetail }>(res);
    if (result.ok && result.data.payRun) setSelected(result.data.payRun);
  }, []);

  useEffect(() => {
    void loadRuns();
    void fetch("/api/admin/branches")
      .then((r) => readAdminJson<{ branches?: Branch[] }>(r))
      .then((result) => {
        if (result.ok) setBranches(result.data.branches || []);
      });
  }, [loadRuns]);

  useEffect(() => {
    setBranchId("");
  }, [country, branchMode]);

  async function createPayRun() {
    setWorking(true);
    setError(null);
    setMessage(null);
    try {
      if (branchMode === "each") {
        const res = await fetch("/api/admin/hr/payroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createEachBranch",
            periodLabel,
            country,
          }),
        });
        const result = await readAdminJson<{
          createdCount?: number;
          skippedBranches?: string[];
          payRuns?: Array<{ id: string }>;
        }>(res);
        if (!result.ok) throw new Error(result.error);
        const count = result.data.createdCount ?? 0;
        const skipped = result.data.skippedBranches?.length ?? 0;
        setMessage(
          count
            ? `Created ${count} pay run${count === 1 ? "" : "s"} — one per branch.${skipped ? ` ${skipped} already existed.` : ""}`
            : "All branches already have a pay run for this period."
        );
        await loadRuns();
        const firstId = result.data.payRuns?.[0]?.id;
        if (firstId) await loadDetail(firstId);
        return;
      }

      const res = await fetch("/api/admin/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodLabel,
          country,
          branchId: branchMode === "single" && branchId ? branchId : null,
        }),
      });
      const result = await readAdminJson<{ payRun?: { id: string } }>(res);
      if (!result.ok) throw new Error(result.error);
      setMessage(
        branchMode === "combined"
          ? "Combined pay run created — includes staff from every branch in this country."
          : "Branch pay run created. Generate payslips to calculate amounts."
      );
      await loadRuns();
      if (result.data.payRun?.id) await loadDetail(result.data.payRun.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setWorking(false);
    }
  }

  async function generateLines(payRunId: string) {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", payRunId }),
      });
      const result = await readAdminJson<{ payRun?: PayRunDetail }>(res);
      if (!result.ok) throw new Error(result.error);
      setMessage("Payslips generated from employee profiles and attendance.");
      if (result.data.payRun) setSelected(result.data.payRun);
      else await loadDetail(payRunId);
      await loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setWorking(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/hr/payroll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const result = await readAdminJson<{
        payRun?: PayRunDetail;
        payslipEmails?: { sent: number; failed: number };
      }>(res);
      if (!result.ok) throw new Error(result.error);
      if (result.data.payRun) setSelected(result.data.payRun);
      if (status === "PAID" && result.data.payslipEmails) {
        const { sent, failed } = result.data.payslipEmails;
        if (sent > 0) {
          setMessage(
            `Marked as paid. Payslip copies emailed to ${sent} employee${sent === 1 ? "" : "s"}.${
              failed ? ` ${failed} could not be sent.` : ""
            }`
          );
        } else if (failed > 0) {
          setMessage(`Marked as paid, but payslip emails failed to send (${failed}).`);
        }
      }
      await loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setWorking(false);
    }
  }

  const exportHref = selected
    ? `/api/admin/reports/export?kind=payroll&payRunId=${encodeURIComponent(selected.id)}`
    : null;

  const showBranchColumn = selected && !selected.branch;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-playfair text-2xl text-[#03045e]">Monthly payroll</h2>
        <p className="text-sm text-mocha mt-1 max-w-2xl">
          Run payroll per branch or as one combined run for the whole country. Ghana PAYE
          and SSNIT are calculated from attendance and approved leave.
        </p>
      </div>

      {(error || message) && (
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm font-roboto ring-1",
            error
              ? "bg-red-50 text-red-800 ring-red-100"
              : "bg-emerald-50 text-emerald-900 ring-emerald-100"
          )}
        >
          {error || message}
        </div>
      )}

      {/* Create form */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] overflow-hidden">
        <div className="border-b border-stone-100 px-5 py-4 sm:px-6">
          <h3 className="font-playfair text-lg text-[#03045e]">New pay run</h3>
        </div>
        <div className="px-5 py-5 sm:px-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={adminLabelClass}>Period</label>
              <input
                type="month"
                className={adminInputClass}
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
              />
            </div>
            <div>
              <label className={adminLabelClass}>Country</label>
              <select
                className={adminSelectClass}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="GH">Ghana (GH)</option>
                <option value="CM">Cameroon (CM)</option>
              </select>
            </div>
            <div>
              <label className={adminLabelClass}>Scope</label>
              <select
                className={adminSelectClass}
                value={branchMode}
                onChange={(e) =>
                  setBranchMode(e.target.value as "combined" | "single" | "each")
                }
              >
                <option value="combined">All branches — one combined run</option>
                <option value="each">All branches — one run per branch</option>
                <option value="single">Single branch</option>
              </select>
            </div>
          </div>

          {branchMode === "single" && (
            <div className="max-w-md">
              <label className={adminLabelClass}>Branch</label>
              <select
                className={adminSelectClass}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                required
              >
                <option value="">Select branch…</option>
                {countryBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <p className="text-xs text-mocha leading-relaxed">
            {branchMode === "combined" &&
              "Includes every active employee in this country across all branches in a single pay run."}
            {branchMode === "each" &&
              `Creates a separate draft pay run for each of your ${countryBranches.length} branch${countryBranches.length === 1 ? "" : "es"} — skips any that already exist for this period.`}
            {branchMode === "single" &&
              "Only staff assigned to the selected branch are included."}
          </p>

          <AdminButton
            type="button"
            disabled={working || (branchMode === "single" && !branchId)}
            onClick={() => void createPayRun()}
            className="gap-2"
          >
            {working ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : branchMode === "each" ? (
              <Layers className="h-4 w-4" />
            ) : (
              <Calendar className="h-4 w-4" />
            )}
            {branchMode === "each" ? "Create per branch" : "Create pay run"}
          </AdminButton>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Pay run list */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] overflow-hidden">
          <div className="border-b border-stone-100 px-5 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-playfair text-lg text-[#03045e]">Pay runs</h3>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "branch", label: "By branch" },
                  { id: "combined", label: "Combined" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setListFilter(f.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-roboto transition-all",
                    listFilter === f.id
                      ? "bg-[#03045e] text-white"
                      : "bg-stone-50 text-mocha ring-1 ring-stone-200/80 hover:ring-[#03045e]/20"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-mocha">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading pay runs…
            </div>
          ) : filteredRuns.length === 0 ? (
            <div className="p-6">
              <AdminEmptyState message="No pay runs for this filter yet." />
            </div>
          ) : (
            <ul className="divide-y divide-stone-100 max-h-[520px] overflow-y-auto">
              {filteredRuns.map((run) => {
                const meta = STATUS_META[run.status] || STATUS_META.DRAFT;
                const active = selected?.id === run.id;
                return (
                  <li key={run.id}>
                    <button
                      type="button"
                      onClick={() => void loadDetail(run.id)}
                      className={cn(
                        "w-full text-left px-5 py-4 sm:px-6 transition-colors flex items-center gap-3",
                        active ? "bg-[#03045e]/[0.04]" : "hover:bg-stone-50/80"
                      )}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fafafa] ring-1 ring-stone-200/80">
                        {run.branch ? (
                          <Building2 className="h-4 w-4 text-[#03045e]" />
                        ) : (
                          <Layers className="h-4 w-4 text-[#03045e]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-[#03045e]">{run.periodLabel}</span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
                              meta.badge
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                            {payRunStatusLabel(run.status)}
                          </span>
                        </div>
                        <p className="text-xs text-mocha mt-0.5 truncate">
                          {branchLabel(run)} · {run._count.lines} staff · {formatPrice(run.totalNet)}
                        </p>
                      </div>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 shrink-0 text-mocha/50",
                          active && "text-[#03045e]"
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Detail panel */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] overflow-hidden min-h-[320px]">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[320px] p-8 text-center">
              <Wallet className="h-10 w-10 text-stone-300 mb-3" />
              <p className="text-sm text-mocha">Select a pay run to review payslips.</p>
            </div>
          ) : (
            <>
              <div className="border-b border-stone-100 px-5 py-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <h3 className="font-playfair text-xl text-[#03045e]">
                      {selected.periodLabel}
                    </h3>
                    <p className="text-sm text-mocha mt-1">
                      {branchLabel(selected)} · {selected.country}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(selected.status === "DRAFT" || selected.status === "REVIEW") && (
                      <AdminButton
                        type="button"
                        variant="secondary"
                        disabled={working}
                        onClick={() => void generateLines(selected.id)}
                        className="gap-1.5"
                      >
                        <RefreshCw className={cn("h-4 w-4", working && "animate-spin")} />
                        Generate payslips
                      </AdminButton>
                    )}
                    {selected.status === "REVIEW" && (
                      <AdminButton
                        type="button"
                        disabled={working}
                        onClick={() => void updateStatus(selected.id, "APPROVED")}
                      >
                        Approve
                      </AdminButton>
                    )}
                    {selected.status === "APPROVED" && (
                      <AdminButton
                        type="button"
                        disabled={working}
                        onClick={() => void updateStatus(selected.id, "PAID")}
                      >
                        Mark paid
                      </AdminButton>
                    )}
                    {selected.lines.length > 0 && (
                      <a
                        href={`/admin/hr/payslip/${selected.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 rounded-2xl px-5 py-2.5 text-sm font-medium font-roboto bg-white text-[#03045e] border border-[#03045e]/15 hover:border-[#03045e]/30 hover:bg-[#f7f6f3]"
                      >
                        <Printer className="h-4 w-4" />
                        Print all
                      </a>
                    )}
                    {exportHref && selected.lines.length > 0 && (
                      <AdminButton href={exportHref} variant="secondary" className="gap-1.5">
                        <Download className="h-4 w-4" />
                        Export CSV
                      </AdminButton>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5 sm:p-6 border-b border-stone-100">
                {[
                  { label: "Gross", value: selected.totalGross },
                  { label: "Deductions", value: selected.totalDeductions },
                  { label: "Net pay", value: selected.totalNet },
                  { label: "Employer SSNIT", value: selected.totalEmployerSsnit },
                ].map((tile) => (
                  <div
                    key={tile.label}
                    className="rounded-xl bg-[#fafafa] px-4 py-3 ring-1 ring-stone-100"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-mocha">
                      {tile.label}
                    </p>
                    <p className="font-playfair text-lg text-[#03045e] mt-1">
                      {formatPrice(tile.value)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                {selected.lines.length === 0 ? (
                  <div className="p-6">
                    <AdminEmptyState message="Generate payslips to populate this pay run." />
                  </div>
                ) : (
                  <table className="w-full text-sm font-roboto">
                    <thead>
                      <tr className="border-b border-stone-100 text-left">
                        <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-mocha font-medium">
                          Employee
                        </th>
                        {showBranchColumn && (
                          <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-mocha font-medium">
                            Branch
                          </th>
                        )}
                        <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-mocha font-medium text-right">
                          Gross
                        </th>
                        <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-mocha font-medium text-right">
                          Net
                        </th>
                        <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-mocha font-medium">
                          Attendance
                        </th>
                        <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-mocha font-medium w-24">
                          Print
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {selected.lines.map((line) => {
                        const lowAttendance =
                          line.workingDays > 0 &&
                          line.proRateFactor < 1 &&
                          line.proRateFactor < 0.5;
                        return (
                          <tr key={line.id} className="hover:bg-stone-50/50">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <StaffAvatar
                                  name={line.staff?.name}
                                  email={line.staff?.email}
                                  image={line.staff?.image}
                                  size="sm"
                                />
                                <div className="min-w-0">
                                  <p className="font-medium text-[#03045e] truncate">
                                    {employeeLabel(line)}
                                  </p>
                                  {line.staff?.name && (
                                    <p className="text-xs text-mocha truncate">
                                      {line.staff.email}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            {showBranchColumn && (
                              <td className="px-3 py-3 text-xs text-mocha">
                                {line.branches?.length
                                  ? line.branches.join(", ")
                                  : "—"}
                              </td>
                            )}
                            <td className="px-3 py-3 text-right tabular-nums">
                              {formatPrice(line.grossPay)}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums font-medium text-[#03045e]">
                              {formatPrice(line.netPay)}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={cn(
                                  "text-xs",
                                  lowAttendance ? "text-amber-700" : "text-mocha"
                                )}
                              >
                                {line.presentDays}/{line.workingDays || "—"} days
                                {line.proRateFactor < 1 && (
                                  <span className="ml-1">
                                    ({Math.round(line.proRateFactor * 100)}% paid)
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <a
                                href={`/admin/hr/payslip/${selected.id}/${line.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-[#03045e] hover:underline"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                Print
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
