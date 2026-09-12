"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminEmptyState,
  adminInputClass,
  adminLabelClass,
} from "@/components/admin/admin-ui";
import { readAdminJson } from "@/lib/admin-fetch";
import { formatPrice } from "@/lib/utils";

type JournalLine = {
  id: string;
  debit: number;
  credit: number;
  memo: string | null;
  account: { code: string; name: string };
};

type Journal = {
  id: string;
  entryDate: string;
  reference: string;
  memo: string | null;
  source: string;
  branch: { name: string } | null;
  createdBy: { name: string | null; email: string };
  lines: JournalLine[];
};

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function AccountingJournalsPanel({ refreshKey }: { refreshKey?: number }) {
  const [month, setMonth] = useState(currentMonthKey());
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await readAdminJson<{ journals: Journal[] }>(
      await fetch(`/api/admin/accounting/journals?month=${encodeURIComponent(month)}`)
    );
    if (!res.ok) {
      setError(res.error);
      setJournals([]);
    } else {
      setJournals(res.data.journals || []);
    }
    setLoading(false);
  }, [month]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

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
        <AdminButton type="button" variant="secondary" onClick={() => void load()}>
          <RefreshCw className="w-4 h-4" />
          Refresh
        </AdminButton>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-mocha py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading journals…
        </div>
      ) : error ? (
        <AdminEmptyState message={error} />
      ) : !journals.length ? (
        <AdminEmptyState message="No journal entries for this month yet." />
      ) : (
        <div className="space-y-3">
          {journals.map((j) => (
            <AdminCard key={j.id} padding="default" className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-espresso">{j.reference}</p>
                  <p className="text-xs text-mocha mt-0.5">
                    {formatDate(j.entryDate)} · {j.source.toLowerCase()}
                    {j.branch ? ` · ${j.branch.name}` : ""}
                  </p>
                  {j.memo ? <p className="text-sm text-mocha mt-1">{j.memo}</p> : null}
                </div>
                <span className="text-[10px] uppercase tracking-wider text-mocha">
                  {j.createdBy.name || j.createdBy.email}
                </span>
              </div>
              <div className="overflow-x-auto rounded-lg ring-1 ring-stone-200/80">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#03045e] text-left text-[10px] uppercase tracking-[0.12em] text-white">
                      <th className="px-3 py-2 font-medium">Account</th>
                      <th className="px-3 py-2 text-right font-medium">Debit</th>
                      <th className="px-3 py-2 text-right font-medium">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {j.lines.map((line) => (
                      <tr key={line.id} className="border-t border-stone-100">
                        <td className="px-3 py-2">
                          <span className="font-mono text-mocha">{line.account.code}</span>{" "}
                          {line.account.name}
                          {line.memo ? (
                            <span className="block text-mocha/80">{line.memo}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {line.debit > 0 ? formatPrice(line.debit, "GHS") : ""}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {line.credit > 0 ? formatPrice(line.credit, "GHS") : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </div>
  );
}
