"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminTabBar,
  adminInputClass,
  adminLabelClass,
} from "@/components/admin/admin-ui";
import { readAdminJson } from "@/lib/admin-fetch";
import { cn, formatPrice } from "@/lib/utils";

const REPORT_TABS = [
  { id: "pl" as const, label: "P&L" },
  { id: "trial" as const, label: "Trial balance" },
];

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

type PlResponse = {
  revenue: number;
  expenses: number;
  netIncome: number;
  rows: { code: string; name: string; type: string; amount: number }[];
};

type TrialResponse = {
  totalDebit: number;
  totalCredit: number;
  rows: { code: string; name: string; type: string; debit: number; credit: number }[];
};

export function AccountingReportsPanel() {
  const [month, setMonth] = useState(currentMonthKey());
  const [view, setView] = useState<"pl" | "trial">("pl");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pl, setPl] = useState<PlResponse | null>(null);
  const [trial, setTrial] = useState<TrialResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await readAdminJson<PlResponse & TrialResponse & { report: string }>(
      await fetch(
        `/api/admin/accounting/reports?month=${encodeURIComponent(month)}&report=${view}`
      )
    );
    if (!res.ok) {
      setError(res.error);
      setPl(null);
      setTrial(null);
    } else if (view === "trial") {
      setTrial(res.data);
      setPl(null);
    } else {
      setPl(res.data);
      setTrial(null);
    }
    setLoading(false);
  }, [month, view]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={adminLabelClass}>Month</label>
          <input
            type="month"
            className={adminInputClass}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        <AdminTabBar tabs={REPORT_TABS} value={view} onChange={setView} size="sm" />
        <AdminButton type="button" variant="secondary" onClick={() => void load()}>
          <RefreshCw className="w-4 h-4" />
          Refresh
        </AdminButton>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-mocha py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading report…
        </div>
      ) : error ? (
        <AdminEmptyState message={error} />
      ) : view === "pl" && pl ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <AdminCard className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-mocha">Revenue</p>
              <p className="text-xl font-semibold text-emerald-800 mt-1">
                {formatPrice(pl.revenue, "GHS")}
              </p>
            </AdminCard>
            <AdminCard className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-mocha">Expenses</p>
              <p className="text-xl font-semibold text-rose-800 mt-1">
                {formatPrice(pl.expenses, "GHS")}
              </p>
            </AdminCard>
            <AdminCard className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-mocha">Net income</p>
              <p
                className={cn(
                  "text-xl font-semibold mt-1",
                  pl.netIncome >= 0 ? "text-[#03045e]" : "text-red-700"
                )}
              >
                {formatPrice(pl.netIncome, "GHS")}
              </p>
            </AdminCard>
          </div>
          {!pl.rows.length ? (
            <AdminEmptyState message="No revenue or expense activity this month." />
          ) : (
            <AdminCard padding="none">
              <table className="w-full text-sm">
                <tbody>
                  {pl.rows.map((r) => (
                    <tr key={r.code} className="border-b border-stone-100 last:border-0">
                      <td className="px-4 py-2 font-mono text-mocha">{r.code}</td>
                      <td className="px-4 py-2">{r.name}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium">
                        {formatPrice(r.amount, "GHS")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminCard>
          )}
        </div>
      ) : view === "trial" && trial ? (
        <AdminCard padding="none">
          <div className="px-4 py-3 border-b border-stone-200 text-sm text-mocha">
            Debits {formatPrice(trial.totalDebit, "GHS")} · Credits{" "}
            {formatPrice(trial.totalCredit, "GHS")}
            {trial.totalDebit === trial.totalCredit ? (
              <span className="text-emerald-700 ml-2">Balanced</span>
            ) : (
              <span className="text-red-600 ml-2">Out of balance</span>
            )}
          </div>
          {!trial.rows.length ? (
            <p className="p-6 text-sm text-mocha">No posted entries this month.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#fafafa] text-left">
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Account</th>
                  <th className="px-4 py-2 text-right">Debit</th>
                  <th className="px-4 py-2 text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {trial.rows.map((r) => (
                  <tr key={r.code} className="border-t border-stone-100">
                    <td className="px-4 py-2 font-mono">{r.code}</td>
                    <td className="px-4 py-2">{r.name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.debit > 0 ? formatPrice(r.debit, "GHS") : ""}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.credit > 0 ? formatPrice(r.credit, "GHS") : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </AdminCard>
      ) : null}
    </div>
  );
}
