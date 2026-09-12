"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  Loader2,
  Plus,
  Receipt,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminEmptyState,
  adminInputClass,
  adminLabelClass,
} from "@/components/admin/admin-ui";
import { StaffAvatar } from "@/components/admin/StaffAvatar";
import { readAdminJson } from "@/lib/admin-fetch";
import { EMPLOYEE_LEAVE_TYPES, workingDaysBetween } from "@/lib/leave-utils";
import { leaveTypeLabel } from "@/lib/payroll-gh";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Payslip = {
  id: string;
  periodLabel: string;
  status: string;
  statusLabel: string;
  paidAt: string | null;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  paye: number;
  ssnitEmployee: number;
  presentDays: number;
  workingDays: number;
};

type Upcoming = {
  periodLabel: string;
  status: string;
  statusLabel: string;
  included: boolean;
  estimate: { grossPay: number; totalDeductions: number; netPay: number } | null;
};

type LeaveRow = {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
};

type MyHrUser = {
  name: string | null;
  email: string;
  image: string | null;
  roleLabel: string;
};

type MyHrProfile = {
  jobTitle: string | null;
  department: string | null;
  leaveBalances: Array<{ leaveType: string; entitled: number; used: number }>;
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100/80 text-amber-900",
  APPROVED: "bg-emerald-100/80 text-emerald-900",
  REJECTED: "bg-red-100/80 text-red-800",
  PAID: "bg-emerald-100/80 text-emerald-900",
  REVIEW: "bg-sky-100/80 text-sky-900",
  DRAFT: "bg-stone-200/60 text-mocha",
};

function formatPeriodLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

function formatShortDate(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  children,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
  icon: typeof Wallet;
  accent: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04] flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-mocha/80">
            {label}
          </p>
          <p className="font-playfair text-2xl text-[#03045e] mt-2 leading-none">{value}</p>
          <p className="text-xs text-mocha mt-2 leading-relaxed">{hint}</p>
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            accent
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </div>
      {children ? <div className="mt-4 pt-4 border-t border-stone-100">{children}</div> : null}
    </div>
  );
}

function PayslipDetailPanel({ slip }: { slip: Payslip | null }) {
  if (!slip) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fafafa] ring-1 ring-stone-200/80 mb-4">
          <Receipt className="h-6 w-6 text-mocha/50" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-medium text-espresso">No payslip selected</p>
        <p className="text-xs text-mocha mt-1 max-w-[14rem]">
          Choose a period from the list to view your earnings breakdown.
        </p>
      </div>
    );
  }

  const rows = [
    { label: "Gross pay", value: slip.grossPay, emphasis: false },
    { label: "PAYE", value: slip.paye, emphasis: false, deduct: true },
    { label: "SSNIT (employee)", value: slip.ssnitEmployee, emphasis: false, deduct: true },
    { label: "Total deductions", value: slip.totalDeductions, emphasis: false, deduct: true },
  ];

  return (
    <div className="p-5">
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-mocha/80">Payslip</p>
        <p className="font-playfair text-xl text-[#03045e] mt-1">
          {formatPeriodLabel(slip.periodLabel)}
        </p>
        <span
          className={cn(
            "inline-block mt-2 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
            STATUS_BADGE[slip.status] || STATUS_BADGE.DRAFT
          )}
        >
          {slip.statusLabel}
        </span>
      </div>

      <dl className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-mocha">{row.label}</dt>
            <dd className={cn("tabular-nums", row.deduct && "text-mocha")}>
              {row.deduct ? "−" : ""}
              {formatPrice(row.value)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 rounded-xl bg-[#03045e] px-4 py-4 text-white">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/70">Net pay</p>
        <p className="font-playfair text-2xl mt-1 tabular-nums">{formatPrice(slip.netPay)}</p>
      </div>

      {slip.workingDays > 0 && (
        <p className="text-xs text-mocha mt-4 flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
          {slip.presentDays} of {slip.workingDays} working days recorded
        </p>
      )}
    </div>
  );
}

export function MyHrPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<MyHrUser | null>(null);
  const [profile, setProfile] = useState<MyHrProfile | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [upcoming, setUpcoming] = useState<Upcoming | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRow[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState<string | null>(null);
  const [leaveFormError, setLeaveFormError] = useState<string | null>(null);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "ANNUAL",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const computedLeaveDays = useMemo(
    () => workingDaysBetween(leaveForm.startDate, leaveForm.endDate),
    [leaveForm.startDate, leaveForm.endDate]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/hr/me");
      const result = await readAdminJson<{
        user?: MyHrUser;
        profile?: MyHrProfile;
        payslips?: Payslip[];
        upcoming?: Upcoming | null;
        leaveRequests?: LeaveRow[];
      }>(res);
      if (!result.ok) throw new Error(result.error);
      setUser(result.data.user || null);
      setProfile(result.data.profile || null);
      const slips = result.data.payslips || [];
      setPayslips(slips);
      setSelectedPayslip(slips[0] ?? null);
      setUpcoming(result.data.upcoming ?? null);
      setLeaveRequests(result.data.leaveRequests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load HR data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function updateLeaveDates(startDate: string, endDate: string) {
    setLeaveForm((f) => ({ ...f, startDate, endDate }));
  }

  async function submitLeaveRequest(e: React.FormEvent) {
    e.preventDefault();
    setLeaveSaving(true);
    setLeaveFormError(null);
    setLeaveMessage(null);
    try {
      const res = await fetch("/api/admin/hr/me/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...leaveForm,
          days: computedLeaveDays,
        }),
      });
      const result = await readAdminJson(res);
      if (!result.ok) throw new Error(result.error);
      setLeaveMessage("Leave request submitted. Your manager will review it.");
      setLeaveForm({ leaveType: "ANNUAL", startDate: "", endDate: "", reason: "" });
      setShowLeaveForm(false);
      await load();
    } catch (err) {
      setLeaveFormError(err instanceof Error ? err.message : "Could not submit request");
    } finally {
      setLeaveSaving(false);
    }
  }

  async function cancelLeaveRequest(id: string) {
    setLeaveSaving(true);
    setLeaveFormError(null);
    try {
      const res = await fetch("/api/admin/hr/me/leave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await readAdminJson(res);
      if (!result.ok) throw new Error(result.error);
      await load();
    } catch (err) {
      setLeaveFormError(err instanceof Error ? err.message : "Could not cancel request");
    } finally {
      setLeaveSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-mocha">
        <Loader2 className="h-5 w-5 animate-spin text-[#03045e]" />
        Loading your HR panel…
      </div>
    );
  }

  if (error) {
    return (
      <AdminCard className="py-10 text-center ring-1 ring-red-100 bg-red-50/50">
        <p className="text-sm text-red-800">{error}</p>
      </AdminCard>
    );
  }

  const annualBalance = profile?.leaveBalances?.find((b) => b.leaveType === "ANNUAL");
  const leaveRemaining = annualBalance
    ? Math.max(0, annualBalance.entitled - annualBalance.used)
    : null;
  const leavePct =
    annualBalance && annualBalance.entitled > 0
      ? Math.min(100, (annualBalance.used / annualBalance.entitled) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Profile hero */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
        <div className="h-20 bg-gradient-to-r from-[#03045e] to-[#0077b6] sm:h-24" />
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 sm:-mt-12">
            {user && (
              <StaffAvatar
                name={user.name}
                email={user.email}
                image={user.image}
                size="xl"
                className="shrink-0 ring-4 ring-white shadow-md"
              />
            )}
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-playfair text-2xl text-[#03045e]">
                  {user?.name || user?.email}
                </h2>
                <span className="rounded-full bg-[#03045e]/8 px-3 py-0.5 text-xs font-medium text-[#03045e]">
                  {user?.roleLabel}
                </span>
              </div>
              <p className="text-sm text-mocha mt-1">{user?.email}</p>
              {profile ? (
                <p className="text-xs text-mocha/90 mt-1">
                  {[profile.jobTitle, profile.department].filter(Boolean).join(" · ") ||
                    "Employee profile on file"}
                </p>
              ) : (
                <p className="text-xs text-amber-800 mt-2 rounded-lg bg-amber-50 px-3 py-1.5 inline-block">
                  HR profile pending — contact your manager for payroll setup.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Upcoming payroll"
          value={upcoming ? formatPeriodLabel(upcoming.periodLabel) : "—"}
          hint={
            upcoming
              ? upcoming.estimate
                ? `Est. net ${formatPrice(upcoming.estimate.netPay)} · ${upcoming.statusLabel}`
                : upcoming.included
                  ? upcoming.statusLabel
                  : `${upcoming.statusLabel} · not yet on this run`
              : "No active pay run for this month"
          }
          icon={Wallet}
          accent="bg-[#03045e]/8 text-[#03045e]"
        />
        <StatCard
          label="Payslips on file"
          value={payslips.length}
          hint="Approved and paid periods only"
          icon={Receipt}
          accent="bg-emerald-500/10 text-emerald-800"
        />
        <StatCard
          label="Annual leave left"
          value={leaveRemaining ?? "—"}
          hint={
            annualBalance
              ? `${annualBalance.used} of ${annualBalance.entitled} days used this year`
              : "Leave balance not configured"
          }
          icon={CalendarDays}
          accent="bg-amber-500/10 text-amber-900"
        >
          {annualBalance ? (
            <div>
              <div className="h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#03045e]/70 transition-all"
                  style={{ width: `${leavePct}%` }}
                />
              </div>
            </div>
          ) : null}
        </StatCard>
      </div>

      {/* Payslips + detail */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] overflow-hidden">
          <div className="border-b border-stone-100 px-5 py-4 sm:px-6">
            <h3 className="font-playfair text-lg text-[#03045e]">Payslip history</h3>
            <p className="text-xs text-mocha mt-0.5">
              Finalized payslips only — drafts are hidden until approved.
            </p>
          </div>

          {payslips.length === 0 ? (
            <div className="py-14">
              <AdminEmptyState message="No payslips yet. They appear here once payroll is approved." />
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {payslips.map((slip) => {
                const active = selectedPayslip?.id === slip.id;
                return (
                  <li key={slip.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedPayslip(slip)}
                      className={cn(
                        "flex w-full items-center gap-4 px-5 py-4 sm:px-6 text-left transition-colors",
                        active
                          ? "bg-[#03045e]/5"
                          : "hover:bg-[#fafafa]"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold",
                          active
                            ? "bg-[#03045e] text-white"
                            : "bg-[#fafafa] text-[#03045e] ring-1 ring-stone-200/80"
                        )}
                      >
                        {slip.periodLabel.slice(5, 7)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-espresso">
                          {formatPeriodLabel(slip.periodLabel)}
                        </p>
                        <p className="text-xs text-mocha mt-0.5">
                          Gross {formatPrice(slip.grossPay)} · Net{" "}
                          <span className="font-medium text-[#03045e]">
                            {formatPrice(slip.netPay)}
                          </span>
                        </p>
                      </div>
                      <span
                        className={cn(
                          "hidden sm:inline shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                          STATUS_BADGE[slip.status] || STATUS_BADGE.DRAFT
                        )}
                      >
                        {slip.statusLabel}
                      </span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 shrink-0 text-mocha/40",
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

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] overflow-hidden lg:sticky lg:top-6 h-fit">
          <PayslipDetailPanel slip={selectedPayslip} />
        </div>
      </div>

      {/* Leave */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] overflow-hidden">
        <div className="border-b border-stone-100 px-5 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-playfair text-lg text-[#03045e]">Your leave</h3>
            <p className="text-xs text-mocha mt-0.5">
              Request time off — working days are counted Mon–Sat.
            </p>
          </div>
          <AdminButton
            type="button"
            variant={showLeaveForm ? "ghost" : "secondary"}
            className="shrink-0 gap-1.5"
            onClick={() => {
              setShowLeaveForm((v) => !v);
              setLeaveFormError(null);
              setLeaveMessage(null);
            }}
          >
            {showLeaveForm ? (
              <>
                <X className="h-4 w-4" />
                Close
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Request leave
              </>
            )}
          </AdminButton>
        </div>

        {(leaveMessage || leaveFormError) && (
          <div
            className={cn(
              "mx-5 sm:mx-6 mt-4 rounded-xl px-4 py-3 text-sm font-roboto ring-1",
              leaveFormError
                ? "bg-red-50 text-red-800 ring-red-100"
                : "bg-emerald-50 text-emerald-900 ring-emerald-100"
            )}
          >
            {leaveFormError || leaveMessage}
          </div>
        )}

        {showLeaveForm && (
          <form
            onSubmit={submitLeaveRequest}
            className="border-b border-stone-100 px-5 py-5 sm:px-6 space-y-4 bg-[#fafafa]/60"
          >
            <div>
              <label className={adminLabelClass}>Leave type</label>
              <div className="flex flex-wrap gap-1.5">
                {EMPLOYEE_LEAVE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setLeaveForm((f) => ({ ...f, leaveType: type }))}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-roboto transition-all",
                      leaveForm.leaveType === type
                        ? "bg-[#03045e] text-white shadow-sm"
                        : "bg-white text-mocha ring-1 ring-stone-200/90 hover:ring-[#03045e]/25"
                    )}
                  >
                    {leaveTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={adminLabelClass}>Start date</label>
                <input
                  type="date"
                  required
                  className={adminInputClass}
                  value={leaveForm.startDate}
                  onChange={(e) =>
                    updateLeaveDates(
                      e.target.value,
                      leaveForm.endDate || e.target.value
                    )
                  }
                />
              </div>
              <div>
                <label className={adminLabelClass}>End date</label>
                <input
                  type="date"
                  required
                  className={adminInputClass}
                  value={leaveForm.endDate}
                  min={leaveForm.startDate || undefined}
                  onChange={(e) =>
                    updateLeaveDates(leaveForm.startDate || e.target.value, e.target.value)
                  }
                />
              </div>
            </div>

            {computedLeaveDays > 0 && (
              <p className="text-xs text-mocha">
                Duration:{" "}
                <span className="font-medium text-[#03045e]">
                  {computedLeaveDays} working day{computedLeaveDays === 1 ? "" : "s"}
                </span>
              </p>
            )}

            <div>
              <label className={adminLabelClass}>Reason (optional)</label>
              <textarea
                rows={2}
                className={cn(adminInputClass, "resize-none min-h-[3.5rem]")}
                placeholder="Brief note for your manager…"
                value={leaveForm.reason}
                onChange={(e) =>
                  setLeaveForm((f) => ({ ...f, reason: e.target.value }))
                }
              />
            </div>

            <AdminButton
              type="submit"
              disabled={leaveSaving || !leaveForm.startDate || !leaveForm.endDate}
            >
              {leaveSaving ? "Submitting…" : "Submit for approval"}
            </AdminButton>
          </form>
        )}

        {leaveRequests.length === 0 ? (
          <div className="py-10">
            <AdminEmptyState message="No leave requests on record." />
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {leaveRequests.map((req) => (
              <li
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6 hover:bg-[#fafafa]/80 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-900">
                    <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-espresso">
                      {leaveTypeLabel(req.leaveType)}
                      <span className="text-mocha font-normal">
                        {" "}
                        · {req.days} day{req.days === 1 ? "" : "s"}
                      </span>
                    </p>
                    <p className="text-xs text-mocha mt-0.5">
                      {formatShortDate(req.startDate)}
                      {req.startDate.slice(0, 10) !== req.endDate.slice(0, 10) && (
                        <>
                          <span className="mx-1.5 text-mocha/40">→</span>
                          {formatShortDate(req.endDate)}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide",
                      STATUS_BADGE[req.status] || STATUS_BADGE.DRAFT
                    )}
                  >
                    {req.status}
                  </span>
                  {req.status === "PENDING" && (
                    <button
                      type="button"
                      disabled={leaveSaving}
                      onClick={() => void cancelLeaveRequest(req.id)}
                      className="text-xs text-mocha hover:text-red-700 underline underline-offset-2 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
