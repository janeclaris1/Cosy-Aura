"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  Fingerprint,
  Loader2,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { readAdminBranchCookie, writeAdminBranchCookie } from "@/lib/admin-context";
import { AdminBranchSelect } from "@/components/admin/AdminBranchSelect";
import { StaffAvatar } from "@/components/admin/StaffAvatar";

type Branch = { id: string; name: string; country: string; isDefault?: boolean };

type StaffRow = {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  status: "IN" | "OUT" | "NONE";
  clockInAt: string | null;
  clockOutAt: string | null;
  lastPunchAt: string | null;
  lastPunchType: string | null;
  punchCount: number;
};

type RecentPunch = {
  id: string;
  name: string;
  punchType: string;
  source: string;
  punchedAt: string;
  deviceName: string | null;
};

type Device = {
  id: string;
  name: string;
  vendor: string | null;
  active: boolean;
  lastSyncAt: string | null;
  webhookUrl: string;
  enrollments: {
    id: string;
    deviceUserId: string;
    userId: string;
    name: string;
  }[];
};

const inputClass =
  "w-full bg-[#fafafa] border border-stone-200/90 px-3 py-2.5 text-sm text-espresso focus:outline-none focus:border-[#03045e]/40 focus:bg-white transition-colors";
const labelClass = "block text-[10px] uppercase tracking-[0.16em] text-mocha mb-1.5";

async function readJsonResponse<T extends Record<string, unknown>>(
  res: Response
): Promise<{ data: T | null; error: string | null }> {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {
      data: null,
      error: res.ok
        ? "Unexpected server response"
        : `Request failed (${res.status})`,
    };
  }
  try {
    const data = (await res.json()) as T;
    return { data, error: null };
  } catch {
    return { data: null, error: "Invalid JSON response from server" };
  }
}

function formatTime(iso: string | null, timezone: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDayLabel(dayKey: string, timezone: string) {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatPunchTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function StatusBadge({ status }: { status: StaffRow["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide",
        status === "IN" && "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80",
        status === "OUT" && "bg-stone-100 text-stone-600 ring-1 ring-stone-200/80",
        status === "NONE" && "bg-stone-50 text-stone-500 ring-1 ring-stone-200/60"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "IN" && "bg-emerald-500",
          status === "OUT" && "bg-stone-400",
          status === "NONE" && "bg-stone-300"
        )}
      />
      {status === "IN" ? "In shop" : status === "OUT" ? "Clocked out" : "Absent"}
    </span>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <div className="bg-white px-5 py-4 flex items-start justify-between gap-3">
      <div>
        <p className={labelClass}>{label}</p>
        <p className="font-playfair text-3xl text-[#03045e] leading-none mt-1">{value}</p>
      </div>
      <div className="rounded-full bg-[#03045e]/5 p-2.5 text-[#03045e]">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
    </div>
  );
}

export function AttendanceDashboard() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dayKey, setDayKey] = useState("");
  const [timezone, setTimezone] = useState("Africa/Accra");
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [recent, setRecent] = useState<RecentPunch[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [deviceVendor, setDeviceVendor] = useState("ZKTeco");
  const [newDeviceSecret, setNewDeviceSecret] = useState<string | null>(null);
  const [enrollDeviceId, setEnrollDeviceId] = useState("");
  const [enrollUserId, setEnrollUserId] = useState("");
  const [enrollDeviceUserId, setEnrollDeviceUserId] = useState("");
  const [canWrite, setCanWrite] = useState(false);
  const [isToday, setIsToday] = useState(true);
  const [filterDay, setFilterDay] = useState("");

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

  useEffect(() => {
    if (branchId) writeAdminBranchCookie(branchId);
  }, [branchId]);

  const load = useCallback(async () => {
    if (!branchId) return;
    setRefreshing(true);
    setError(null);
    try {
      const dayQuery = filterDay ? `&day=${encodeURIComponent(filterDay)}` : "";
      const [todayRes, devicesRes] = await Promise.all([
        fetch(
          `/api/admin/attendance/today?branchId=${encodeURIComponent(branchId)}${dayQuery}`
        ),
        fetch(`/api/admin/attendance/devices?branchId=${encodeURIComponent(branchId)}`),
      ]);
      const todayParsed = await readJsonResponse<{
        error?: string;
        dayKey?: string;
        timezone?: string;
        rows?: StaffRow[];
        recent?: RecentPunch[];
        canWrite?: boolean;
        isToday?: boolean;
      }>(todayRes);
      const devicesParsed = await readJsonResponse<{
        error?: string;
        devices?: Device[];
      }>(devicesRes);

      if (todayParsed.error || !todayParsed.data) {
        setError(todayParsed.error || "Failed to load attendance");
        return;
      }
      if (!todayRes.ok) {
        setError(todayParsed.data.error || "Failed to load attendance");
        return;
      }

      const todayData = todayParsed.data;
      setDayKey(todayData.dayKey || "");
      setTimezone(todayData.timezone || "Africa/Accra");
      setRows(todayData.rows || []);
      setRecent(todayData.recent || []);
      setCanWrite(Boolean(todayData.canWrite));
      setIsToday(todayData.isToday !== false);

      if (devicesRes.ok && devicesParsed.data) {
        const list = devicesParsed.data.devices || [];
        setDevices(list);
        setEnrollDeviceId((current) => current || list[0]?.id || "");
      } else if (!devicesRes.ok) {
        setError(
          devicesParsed.data?.error ||
            devicesParsed.error ||
            "Failed to load attendance devices"
        );
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [branchId, filterDay]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    setFilterDay("");
  }, [branchId]);

  const manualPunch = async (
    userId: string,
    punchType: "CLOCK_IN" | "CLOCK_OUT"
  ) => {
    if (!branchId || !canWrite) return;
    setBusyUserId(userId);
    setError(null);
    try {
      const res = await fetch("/api/admin/attendance/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, userId, punchType }),
      });
      const parsed = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok || parsed.error) {
        setError(parsed.data?.error || parsed.error || "Punch failed");
        return;
      }
      await load();
    } finally {
      setBusyUserId(null);
    }
  };

  const createDevice = async () => {
    if (!branchId || !deviceName.trim()) return;
    setError(null);
    const res = await fetch("/api/admin/attendance/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId,
        name: deviceName.trim(),
        vendor: deviceVendor.trim() || undefined,
      }),
    });
    const parsed = await readJsonResponse<{ error?: string; webhookSecret?: string }>(res);
    if (!res.ok || parsed.error) {
      setError(parsed.data?.error || parsed.error || "Could not register device");
      return;
    }
    setNewDeviceSecret(parsed.data?.webhookSecret || null);
    setDeviceName("");
    setShowDeviceForm(false);
    await load();
  };

  const saveEnrollment = async () => {
    if (!enrollDeviceId || !enrollUserId || !enrollDeviceUserId.trim()) return;
    setError(null);
    const res = await fetch("/api/admin/attendance/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: enrollDeviceId,
        userId: enrollUserId,
        deviceUserId: enrollDeviceUserId.trim(),
      }),
    });
    const parsed = await readJsonResponse<{ error?: string }>(res);
    if (!res.ok || parsed.error) {
      setError(parsed.data?.error || parsed.error || "Enrollment failed");
      return;
    }
    setEnrollDeviceUserId("");
    await load();
  };

  const inCount = rows.filter((r) => r.status === "IN").length;
  const showActions = canWrite && isToday;
  const dateInputValue = filterDay || dayKey;
  const branch = branches.find((b) => b.id === branchId);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white shadow-sm ring-1 ring-black/[0.04] px-4 py-4 md:px-6 md:py-5">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6">
          <div className="grid sm:grid-cols-2 gap-4 flex-1 max-w-xl">
            <AdminBranchSelect
              branches={branches}
              value={branchId}
              onChange={setBranchId}
              className="min-w-0 w-full"
            />
            <label className="block">
              <span className={labelClass}>
                <CalendarDays className="inline w-3 h-3 mr-1 -mt-0.5" />
                Date
              </span>
              <input
                type="date"
                value={dateInputValue}
                onChange={(e) => setFilterDay(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterDay("")}
              disabled={!filterDay && isToday}
              className="px-4 py-2.5 text-sm text-[#03045e] border border-stone-200/90 hover:bg-stone-50 disabled:opacity-35 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => void load()}
              disabled={refreshing || !branchId}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm bg-[#03045e] text-white hover:bg-[#02033f] disabled:opacity-40 transition-colors"
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" strokeWidth={1.75} />
              )}
              Refresh
            </button>
          </div>
        </div>
        {dayKey && (
          <p className="text-xs text-mocha mt-4 pt-4 border-t border-stone-100">
            {isToday ? "Today" : "Viewing"} · {formatDayLabel(dayKey, timezone)}
            {branch ? ` · ${branch.name}` : ""}
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-800 bg-red-50/80 ring-1 ring-red-100 px-4 py-3">
          {error}
        </p>
      )}

      {!loading && !canWrite && (
        <p className="text-sm text-mocha bg-stone-50 ring-1 ring-stone-100 px-4 py-3">
          View only — manual clock-in/out requires manager access.
        </p>
      )}

      {!loading && canWrite && !isToday && (
        <p className="text-sm text-mocha bg-stone-50 ring-1 ring-stone-100 px-4 py-3">
          Historical view — clock in/out is available for today only.
        </p>
      )}

      {newDeviceSecret && (
        <div className="bg-amber-50/90 ring-1 ring-amber-100 px-4 py-4 text-sm space-y-2">
          <p className="font-medium text-amber-950">Save this webhook secret — shown once.</p>
          <p className="font-mono break-all text-xs bg-white/80 ring-1 ring-amber-100 px-3 py-2">
            {newDeviceSecret}
          </p>
          <button
            type="button"
            onClick={() => setNewDeviceSecret(null)}
            className="text-xs text-amber-900/80 hover:text-amber-950 underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-px bg-stone-200/50 shadow-sm ring-1 ring-black/[0.04] overflow-hidden">
        <StatTile
          label={isToday ? "In shop now" : "Ended day in shop"}
          value={inCount}
          icon={Users}
        />
        <StatTile label="On roster" value={rows.length} icon={Fingerprint} />
        <StatTile label="Terminals" value={devices.length} icon={Building2} />
      </div>

      {/* Staff table */}
      <section className="bg-white shadow-sm ring-1 ring-black/[0.04] overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-playfair text-lg text-[#03045e]">
              {isToday ? "Today's roster" : "Daily roster"}
            </h2>
            {dayKey && (
              <p className="text-xs text-mocha mt-0.5">{formatDayLabel(dayKey, timezone)}</p>
            )}
          </div>
          {!loading && (
            <span className="text-xs text-mocha tabular-nums">
              {inCount} of {rows.length} present
            </span>
          )}
        </div>

        {loading ? (
          <p className="p-10 text-sm text-mocha inline-flex items-center justify-center gap-2 w-full">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading attendance…
          </p>
        ) : rows.length === 0 ? (
          <p className="p-10 text-sm text-mocha text-center max-w-md mx-auto leading-relaxed">
            No staff linked to this branch. Assign team members under Admin → Staff.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-mocha bg-[#fafafa]">
                  <th className="px-5 py-3 font-medium">Staff</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">In</th>
                  <th className="px-5 py-3 font-medium">Out</th>
                  <th className="px-5 py-3 font-medium hidden md:table-cell">Last event</th>
                  {showActions && (
                    <th className="px-5 py-3 font-medium text-right min-w-[10rem]">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((row) => (
                  <tr key={row.userId} className="hover:bg-[#fafafa]/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <StaffAvatar
                          name={row.name}
                          email={row.email}
                          image={row.image}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium text-espresso">{row.name}</p>
                          <p className="text-xs text-mocha mt-0.5">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-4 text-mocha tabular-nums">
                      {formatTime(row.clockInAt, timezone)}
                    </td>
                    <td className="px-5 py-4 text-mocha tabular-nums">
                      {formatTime(row.clockOutAt, timezone)}
                    </td>
                    <td className="px-5 py-4 text-mocha hidden md:table-cell">
                      {row.lastPunchType ? (
                        <span className="text-xs">
                          {row.lastPunchType === "CLOCK_IN" ? "In" : "Out"} at{" "}
                          {formatTime(row.lastPunchAt, timezone)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    {showActions && (
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={busyUserId === row.userId || row.status === "IN"}
                            onClick={() => void manualPunch(row.userId, "CLOCK_IN")}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 border border-stone-200 text-[#03045e] hover:bg-[#03045e]/5 disabled:opacity-35 transition-colors"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            In
                          </button>
                          <button
                            type="button"
                            disabled={
                              busyUserId === row.userId ||
                              row.status === "OUT" ||
                              row.status === "NONE"
                            }
                            onClick={() => void manualPunch(row.userId, "CLOCK_OUT")}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 border border-stone-200 text-mocha hover:bg-stone-50 disabled:opacity-35 transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            Out
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Activity + devices */}
      <div className="grid lg:grid-cols-5 gap-6">
        <section className="lg:col-span-2 bg-white shadow-sm ring-1 ring-black/[0.04] flex flex-col min-h-[18rem]">
          <div className="px-5 py-4 border-b border-stone-100">
            <h2 className="font-playfair text-lg text-[#03045e]">Activity log</h2>
            <p className="text-xs text-mocha mt-0.5">Clock events for selected day</p>
          </div>
          <ul className="flex-1 overflow-y-auto divide-y divide-stone-50">
            {recent.length === 0 ? (
              <li className="p-8 text-sm text-mocha text-center">No punches recorded.</li>
            ) : (
              recent.map((p) => (
                <li key={p.id} className="px-5 py-3.5 flex gap-3">
                  <div
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      p.punchType === "CLOCK_IN" ? "bg-emerald-500" : "bg-stone-400"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-espresso truncate">{p.name}</p>
                    <p className="text-xs text-mocha mt-0.5">
                      {p.punchType === "CLOCK_IN" ? "Clocked in" : "Clocked out"} ·{" "}
                      {formatPunchTime(p.punchedAt, timezone)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-mocha/70 mt-1">
                      {p.source}
                      {p.deviceName ? ` · ${p.deviceName}` : ""}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="lg:col-span-3 bg-white shadow-sm ring-1 ring-black/[0.04]">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-playfair text-lg text-[#03045e]">Biometric terminals</h2>
              <p className="text-xs text-mocha mt-0.5">Webhook integration for fingerprint devices</p>
            </div>
            {canWrite && (
              <button
                type="button"
                onClick={() => setShowDeviceForm((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-2 bg-[#03045e] text-white hover:bg-[#02033f] transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add terminal
              </button>
            )}
          </div>

          {showDeviceForm && (
            <div className="px-5 py-4 border-b border-stone-100 bg-[#fafafa] space-y-3">
              <input
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Terminal name"
                className={inputClass}
              />
              <input
                value={deviceVendor}
                onChange={(e) => setDeviceVendor(e.target.value)}
                placeholder="Vendor (ZKTeco, Hikvision…)"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => void createDevice()}
                className="text-sm bg-[#03045e] text-white px-4 py-2.5 hover:bg-[#02033f] transition-colors"
              >
                Register terminal
              </button>
            </div>
          )}

          {devices.length === 0 ? (
            <p className="p-8 text-sm text-mocha text-center leading-relaxed max-w-sm mx-auto">
              Connect a fingerprint terminal to receive automatic clock-in/out events.
            </p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {devices.map((d) => (
                <li key={d.id} className="px-5 py-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-espresso">{d.name}</p>
                    {d.vendor && (
                      <span className="text-[10px] uppercase tracking-wider text-mocha shrink-0">
                        {d.vendor}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-mocha font-mono break-all opacity-80">{d.webhookUrl}</p>
                  <p className="text-xs text-mocha">
                    {d.enrollments.length} enrolled
                    {d.lastSyncAt
                      ? ` · Last sync ${new Date(d.lastSyncAt).toLocaleString()}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {canWrite && devices.length > 0 && rows.length > 0 && (
            <div className="px-5 py-5 border-t border-stone-100 bg-[#fafafa] space-y-3">
              <div>
                <h3 className="text-sm font-medium text-espresso">Link device user to staff</h3>
                <p className="text-xs text-mocha mt-1 leading-relaxed">
                  After enrolling fingerprints on the terminal, match each device user ID to a staff account.
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-2">
                <select
                  value={enrollDeviceId}
                  onChange={(e) => setEnrollDeviceId(e.target.value)}
                  className={inputClass}
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <select
                  value={enrollUserId}
                  onChange={(e) => setEnrollUserId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select staff…</option>
                  {rows.map((r) => (
                    <option key={r.userId} value={r.userId}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <input
                  value={enrollDeviceUserId}
                  onChange={(e) => setEnrollDeviceUserId(e.target.value)}
                  placeholder="Device user ID"
                  className={cn(inputClass, "font-mono")}
                />
              </div>
              <button
                type="button"
                onClick={() => void saveEnrollment()}
                className="text-sm bg-[#03045e] text-white px-4 py-2.5 hover:bg-[#02033f] transition-colors"
              >
                Save mapping
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
