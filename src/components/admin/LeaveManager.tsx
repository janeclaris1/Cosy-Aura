"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminTabBar,
  adminInputClass,
  adminLabelClass,
} from "@/components/admin/admin-ui";
import {
  EmployeeSelect,
  type EmployeeSelectOption,
} from "@/components/admin/EmployeeSelect";
import { readAdminJson } from "@/lib/admin-fetch";
import { workingDaysBetween } from "@/lib/leave-utils";
import { leaveTypeLabel } from "@/lib/payroll-gh";
import { StaffAvatar } from "@/components/admin/StaffAvatar";
import { cn } from "@/lib/utils";

type LeaveRequest = {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: string;
  createdAt: string;
  employee: {
    id: string;
    user: { id: string; name: string | null; email: string; image: string | null };
    leaveBalances: Array<{ entitled: number; used: number }>;
  };
  reviewedBy: { name: string | null; email: string } | null;
};


const LEAVE_TYPES = [
  { id: "ANNUAL", label: "Annual" },
  { id: "SICK", label: "Sick" },
  { id: "MATERNITY", label: "Maternity" },
  { id: "PATERNITY", label: "Paternity" },
  { id: "COMPASSIONATE", label: "Compassionate" },
  { id: "UNPAID", label: "Unpaid" },
] as const;

const FILTERS = [
  { id: "", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
] as const;

const STATUS_META: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  PENDING: {
    label: "Pending",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-900 ring-amber-200/80",
  },
  APPROVED: {
    label: "Approved",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-900 ring-emerald-200/80",
  },
  REJECTED: {
    label: "Rejected",
    dot: "bg-red-400",
    badge: "bg-red-50 text-red-800 ring-red-200/80",
  },
  CANCELLED: {
    label: "Cancelled",
    dot: "bg-stone-300",
    badge: "bg-stone-100 text-mocha ring-stone-200/80",
  },
};

function formatShortDate(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function LeaveManager() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<EmployeeSelectOption[]>([]);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    employeeId: "",
    leaveType: "ANNUAL",
    startDate: "",
    endDate: "",
    days: "1",
    reason: "",
  });

  const computedDays = useMemo(
    () => workingDaysBetween(form.startDate, form.endDate),
    [form.startDate, form.endDate]
  );

  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === "PENDING").length;
    const approved = requests.filter((r) => r.status === "APPROVED").length;
    const pendingDays = requests
      .filter((r) => r.status === "PENDING")
      .reduce((n, r) => n + r.days, 0);
    return { pending, approved, pendingDays };
  }, [requests]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filter ? `?status=${encodeURIComponent(filter)}` : "";
      const [leaveRes, empRes] = await Promise.all([
        fetch(`/api/admin/hr/leave${qs}`),
        fetch("/api/admin/hr/employees"),
      ]);
      const leaveResult = await readAdminJson<{ requests?: LeaveRequest[] }>(leaveRes);
      const empResult = await readAdminJson<{ employees?: unknown[] }>(empRes);
      if (!leaveResult.ok) throw new Error(leaveResult.error);
      if (!empResult.ok) throw new Error(empResult.error);
      setRequests(leaveResult.data.requests || []);
      setEmployees(
        (empResult.data.employees || [])
          .filter((r: { profile: unknown }) => r.profile)
          .map(
            (r: {
              profile: {
                id: string;
                jobTitle?: string | null;
                leaveBalances?: Array<{ entitled: number; used: number }>;
              };
              user: { name: string | null; email: string };
            }) => ({
              id: r.profile.id,
              name: r.user.name || r.user.email,
              email: r.user.email,
              jobTitle: r.profile.jobTitle,
              balance: r.profile.leaveBalances?.[0],
            })
          )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (computedDays > 0) {
      setForm((f) => ({ ...f, days: String(computedDays) }));
    }
  }, [computedDays]);

  function updateDates(startDate: string, endDate: string) {
    setForm((f) => ({
      ...f,
      startDate,
      endDate,
      days: String(workingDaysBetween(startDate, endDate) || f.days),
    }));
  }

  async function submitLeave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/hr/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          days: Number(form.days),
        }),
      });
      const result = await readAdminJson(res);
      if (!result.ok) throw new Error(result.error);
      setMessage("Leave request submitted for review.");
      setForm({
        employeeId: "",
        leaveType: "ANNUAL",
        startDate: "",
        endDate: "",
        days: "1",
        reason: "",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function review(id: string, status: "APPROVED" | "REJECTED") {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/hr/leave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const result = await readAdminJson(res);
      if (!result.ok) throw new Error(result.error);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Awaiting review",
            value: stats.pending,
            sub: `${stats.pendingDays} day${stats.pendingDays === 1 ? "" : "s"} requested`,
            icon: Clock,
            accent: "text-amber-700 bg-amber-50 ring-amber-100",
          },
          {
            label: "Approved",
            value: stats.approved,
            sub: "In current view",
            icon: Check,
            accent: "text-emerald-700 bg-emerald-50 ring-emerald-100",
          },
          {
            label: "Team on leave",
            value: employees.length,
            sub: "With HR profiles",
            icon: CalendarDays,
            accent: "text-[#03045e] bg-[#03045e]/5 ring-[#03045e]/10",
          },
        ].map((tile) => (
          <div
            key={tile.label}
            className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/[0.04] shadow-sm"
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1",
                tile.accent
              )}
            >
              <tile.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-mocha">
                {tile.label}
              </p>
              <p className="font-playfair text-2xl text-[#03045e] mt-0.5">{tile.value}</p>
              <p className="text-xs text-mocha mt-0.5">{tile.sub}</p>
            </div>
          </div>
        ))}
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,22rem)_1fr] xl:items-start">
        <AdminCard
          className={cn(
            "xl:sticky xl:top-4 overflow-hidden !p-0",
            !showForm && "hidden xl:block"
          )}
        >
          <div className="border-b border-stone-100 bg-[#fafafa] px-5 py-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-playfair text-lg text-[#03045e]">New request</h3>
                <p className="text-xs text-mocha mt-0.5">
                  Working days auto-calculated (Mon–Sat).
                </p>
              </div>
              <button
                type="button"
                className="xl:hidden rounded-lg p-1.5 text-mocha hover:bg-stone-200/60"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <form onSubmit={submitLeave} className="space-y-5 p-5">
            <EmployeeSelect
              employees={employees}
              value={form.employeeId}
              onChange={(employeeId) =>
                setForm((f) => ({ ...f, employeeId }))
              }
              disabled={!employees.length}
            />

            <div>
              <label className={adminLabelClass}>Leave type</label>
              <div className="flex flex-wrap gap-1.5">
                {LEAVE_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, leaveType: type.id }))
                    }
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-roboto transition-all",
                      form.leaveType === type.id
                        ? "bg-[#03045e] text-white shadow-sm"
                        : "bg-[#fafafa] text-mocha ring-1 ring-stone-200/90 hover:ring-[#03045e]/25"
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-[#fafafa] p-4 ring-1 ring-stone-100 space-y-3">
              <label className={adminLabelClass}>Dates</label>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <input
                  type="date"
                  required
                  className={cn(adminInputClass, "!bg-white")}
                  value={form.startDate}
                  onChange={(e) =>
                    updateDates(e.target.value, form.endDate || e.target.value)
                  }
                />
                <ChevronRight className="h-4 w-4 text-mocha shrink-0" />
                <input
                  type="date"
                  required
                  className={cn(adminInputClass, "!bg-white")}
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={(e) =>
                    updateDates(form.startDate || e.target.value, e.target.value)
                  }
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-mocha">Duration</span>
                <span className="font-medium text-[#03045e]">
                  {computedDays > 0 ? `${computedDays} working day${computedDays === 1 ? "" : "s"}` : "Pick dates"}
                </span>
              </div>
            </div>

            <div>
              <label className={adminLabelClass}>Reason (optional)</label>
              <textarea
                rows={3}
                className={cn(adminInputClass, "resize-none min-h-[4.5rem]")}
                placeholder="Brief note for the approver…"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>

            <AdminButton
              type="submit"
              disabled={saving || !employees.length || !form.employeeId}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit for review"
              )}
            </AdminButton>
          </form>
        </AdminCard>

        <div className="space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-playfair text-xl text-[#03045e]">Requests</h3>
              <p className="text-xs text-mocha mt-0.5">
                Approved annual leave is included in payroll pro-rating.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="xl:hidden inline-flex items-center gap-1.5 rounded-2xl bg-[#03045e] px-4 py-2 text-sm font-roboto text-white"
                onClick={() => setShowForm(true)}
              >
                <Plus className="h-4 w-4" />
                New request
              </button>
              <AdminTabBar
                size="sm"
                tabs={FILTERS.map((f) => ({ id: f.id || "all", label: f.label }))}
                value={filter || "all"}
                onChange={(id) => setFilter(id === "all" ? "" : id)}
              />
            </div>
          </div>

          {loading ? (
            <AdminCard className="flex items-center justify-center gap-2 py-16 text-sm text-mocha">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading requests…
            </AdminCard>
          ) : requests.length === 0 ? (
            <AdminCard>
              <AdminEmptyState message="No leave requests match this filter." />
            </AdminCard>
          ) : (
            <ul className="space-y-3">
              {requests.map((req) => {
                const meta = STATUS_META[req.status] || STATUS_META.CANCELLED;
                const name =
                  req.employee.user.name || req.employee.user.email;
                return (
                  <li key={req.id}>
                    <AdminCard className="!p-0 overflow-hidden hover:ring-[#03045e]/10 transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-stretch">
                        <div className="flex flex-1 gap-4 p-4 sm:p-5">
                          <StaffAvatar
                            name={req.employee.user.name}
                            email={req.employee.user.email}
                            image={req.employee.user.image}
                            size="md"
                            className="shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-espresso truncate">
                                {name}
                              </p>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wide ring-1",
                                  meta.badge
                                )}
                              >
                                <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                                {meta.label}
                              </span>
                            </div>
                            <p className="text-sm text-mocha mt-1">
                              {leaveTypeLabel(req.leaveType)} ·{" "}
                              <span className="text-espresso font-medium">
                                {req.days} day{req.days === 1 ? "" : "s"}
                              </span>
                            </p>
                            <p className="text-xs text-mocha mt-1 flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                              {formatShortDate(req.startDate)}
                              {req.startDate.slice(0, 10) !== req.endDate.slice(0, 10) && (
                                <>
                                  <ChevronRight className="h-3 w-3" />
                                  {formatShortDate(req.endDate)}
                                </>
                              )}
                            </p>
                            {req.reason && (
                              <p className="text-xs text-mocha mt-2 line-clamp-2 italic">
                                “{req.reason}”
                              </p>
                            )}
                          </div>
                        </div>

                        {req.status === "PENDING" && (
                          <div className="flex sm:flex-col border-t sm:border-t-0 sm:border-l border-stone-100 shrink-0">
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void review(req.id, "APPROVED")}
                              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-3 text-sm font-roboto text-emerald-800 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                            >
                              <Check className="h-4 w-4" />
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void review(req.id, "REJECTED")}
                              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-3 text-sm font-roboto text-red-700 hover:bg-red-50 transition-colors border-t sm:border-t-0 sm:border-l border-stone-100 disabled:opacity-50"
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </AdminCard>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
