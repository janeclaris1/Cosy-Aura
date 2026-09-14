"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AdminCard,
  AdminEmptyState,
  adminInputClass,
  adminLabelClass,
  adminSelectClass,
} from "@/components/admin/admin-ui";
import { readAdminJson } from "@/lib/admin-fetch";
import { StaffAvatar } from "@/components/admin/StaffAvatar";
import { formatPrice, fragranceFamilyLabel } from "@/lib/utils";

type Entry = {
  id: string;
  productLabel: string;
  fragranceFamily: string;
  lineTotalGhs: number;
  commissionRate: number;
  commissionGhs: number;
  status: string;
  earnedAt: string;
  employee: {
    id: string;
    employeeNumber: string | null;
    user: { id: string; name: string | null; email: string; image?: string | null };
  };
  branch: { name: string; country: string };
  order: { receiptNumber: string | null; createdAt: string };
};

const STATUS_FILTERS = [
  { id: "", label: "All" },
  { id: "EARNED", label: "Pending payroll" },
  { id: "PAID", label: "Paid" },
  { id: "VOIDED", label: "Voided" },
];

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function StaffCommissionsPanel() {
  const [month, setMonth] = useState(currentMonthKey());
  const [status, setStatus] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [totals, setTotals] = useState({ earned: 0, paid: 0, voided: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ month });
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/hr/commissions?${params}`);
      const result = await readAdminJson<{
        entries: Entry[];
        totals: { earned: number; paid: number; voided: number };
      }>(res);
      if (!result.ok) {
        setError(result.error);
        setEntries([]);
        return;
      }
      setEntries(result.data.entries ?? []);
      setTotals(result.data.totals ?? { earned: 0, paid: 0, voided: 0 });
    } finally {
      setLoading(false);
    }
  }, [month, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-stone-500">Pending payroll</p>
          <p className="mt-1 font-playfair text-xl text-[#03045e]">
            {formatPrice(totals.earned, "GHS")}
          </p>
        </AdminCard>
        <AdminCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-stone-500">Paid this month</p>
          <p className="mt-1 font-playfair text-xl text-emerald-800">
            {formatPrice(totals.paid, "GHS")}
          </p>
        </AdminCard>
        <AdminCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-stone-500">Voided</p>
          <p className="mt-1 font-playfair text-xl text-stone-600">
            {formatPrice(totals.voided, "GHS")}
          </p>
        </AdminCard>
      </div>

      <AdminCard className="p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className={adminLabelClass}>Month</label>
            <input
              type="month"
              className={adminInputClass}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <div>
            <label className={adminLabelClass}>Status</label>
            <select
              className={adminSelectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.id || "all"} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </AdminCard>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-mocha">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading commissions…
        </p>
      ) : entries.length === 0 ? (
        <AdminEmptyState message="No commissions for this period. POS sales on eligible scent families will appear here once rules are configured." />
      ) : (
        <AdminCard className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/80 text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="px-4 py-3 font-medium">Staff ID</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Sale</th>
                <th className="px-4 py-3 font-medium">Commission</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StaffAvatar
                        name={entry.employee.user.name}
                        email={entry.employee.user.email}
                        image={entry.employee.user.image}
                        size="xs"
                      />
                      <div>
                        <p className="font-medium text-[#03045e]">
                          {entry.employee.employeeNumber || "—"}
                        </p>
                        <p className="text-xs text-stone-500">
                          {entry.employee.user.name || entry.employee.user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#03045e]">{entry.productLabel}</p>
                    <p className="text-xs text-stone-500">
                      {fragranceFamilyLabel(entry.fragranceFamily)} · {entry.commissionRate}%
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {formatPrice(entry.lineTotalGhs, "GHS")}
                    {entry.order.receiptNumber && (
                      <p className="text-xs text-stone-500">{entry.order.receiptNumber}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatPrice(entry.commissionGhs, "GHS")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
                      {entry.status === "EARNED" ? "Pending" : entry.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      )}
    </div>
  );
}
