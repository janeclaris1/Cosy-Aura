"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Landmark,
  Loader2,
  PiggyBank,
  Receipt,
  Scale,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  AdminCard,
  AdminEmptyState,
  AdminSectionBar,
  AdminStatTile,
  adminInputClass,
  adminLabelClass,
} from "@/components/admin/admin-ui";
import { readAdminJson } from "@/lib/admin-fetch";
import { cn } from "@/lib/utils";

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  description: string | null;
};

type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

const TYPE_ORDER: AccountType[] = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "REVENUE",
  "EXPENSE",
];

const TYPE_META: Record<
  AccountType,
  {
    label: string;
    plural: string;
    icon: typeof Wallet;
    badge: string;
    bar: string;
    rowAccent: string;
  }
> = {
  ASSET: {
    label: "Asset",
    plural: "Assets",
    icon: Wallet,
    badge: "bg-sky-50 text-sky-900 ring-sky-200/60",
    bar: "bg-sky-600",
    rowAccent: "border-l-sky-400",
  },
  LIABILITY: {
    label: "Liability",
    plural: "Liabilities",
    icon: Scale,
    badge: "bg-amber-50 text-amber-900 ring-amber-200/60",
    bar: "bg-amber-600",
    rowAccent: "border-l-amber-400",
  },
  EQUITY: {
    label: "Equity",
    plural: "Equity",
    icon: PiggyBank,
    badge: "bg-violet-50 text-violet-900 ring-violet-200/60",
    bar: "bg-violet-600",
    rowAccent: "border-l-violet-400",
  },
  REVENUE: {
    label: "Revenue",
    plural: "Revenue",
    icon: TrendingUp,
    badge: "bg-emerald-50 text-emerald-900 ring-emerald-200/60",
    bar: "bg-emerald-600",
    rowAccent: "border-l-emerald-400",
  },
  EXPENSE: {
    label: "Expense",
    plural: "Expenses",
    icon: Receipt,
    badge: "bg-rose-50 text-rose-900 ring-rose-200/60",
    bar: "bg-rose-600",
    rowAccent: "border-l-rose-400",
  },
};

function subgroupLabel(type: AccountType, code: string): string | null {
  const n = Number(code);
  if (!Number.isFinite(n)) return null;
  if (type === "ASSET") {
    if (n < 1100) return "Cash & payments";
    if (n < 1300) return "Inventory";
    return "Equipment";
  }
  if (type === "LIABILITY") {
    if (n < 2110) return "Trade payables";
    return "Tax & statutory";
  }
  if (type === "EXPENSE") {
    if (n < 5200) return "Cost of goods sold";
    if (n < 6200) return "Payroll";
    return "Operating expenses";
  }
  return null;
}

function groupAccountsByType(accounts: Account[]) {
  const map = new Map<AccountType, Account[]>();
  for (const t of TYPE_ORDER) map.set(t, []);
  for (const a of accounts) {
    const t = a.type as AccountType;
    if (map.has(t)) map.get(t)!.push(a);
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.code.localeCompare(b.code));
  }
  return map;
}

export function AccountingCoaPanel() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AccountType | "ALL">("ALL");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      const res = await readAdminJson<{ accounts: Account[] }>(
        await fetch("/api/admin/accounting/accounts")
      );
      if (cancelled) return;
      if (!res.ok) {
        setError(res.error);
        setAccounts([]);
      } else {
        setAccounts(res.data.accounts || []);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((a) => {
      if (typeFilter !== "ALL" && a.type !== typeFilter) return false;
      if (!q) return true;
      return (
        a.code.includes(q) ||
        a.name.toLowerCase().includes(q) ||
        (a.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [accounts, query, typeFilter]);

  const grouped = useMemo(() => groupAccountsByType(filtered), [filtered]);

  const typeCounts = useMemo(() => {
    const counts = {} as Record<AccountType, number>;
    for (const t of TYPE_ORDER) counts[t] = 0;
    for (const a of accounts) {
      const t = a.type as AccountType;
      if (t in counts) counts[t] += 1;
    }
    return counts;
  }, [accounts]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-mocha py-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading chart of accounts…
      </div>
    );
  }

  if (error) {
    return <AdminEmptyState message={error} />;
  }

  const visibleTypes = TYPE_ORDER.filter((t) => (grouped.get(t)?.length ?? 0) > 0);

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {TYPE_ORDER.map((t) => {
          const meta = TYPE_META[t];
          const active = typeFilter === t;
          return (
            <AdminStatTile
              key={t}
              label={meta.plural}
              value={typeCounts[t]}
              icon={meta.icon}
              active={active}
              onClick={() => setTypeFilter(active ? "ALL" : t)}
            />
          );
        })}
      </div>

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className={adminLabelClass} htmlFor="coa-search">
            Search accounts
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mocha pointer-events-none" />
            <input
              id="coa-search"
              type="search"
              placeholder="Code, name, or description…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={cn(adminInputClass, "pl-9")}
            />
          </div>
        </div>
        {typeFilter !== "ALL" && (
          <button
            type="button"
            onClick={() => setTypeFilter("ALL")}
            className="text-sm text-[#03045e] font-medium hover:underline shrink-0 pb-2.5"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Ledger intro */}
      <AdminCard className="flex flex-wrap items-center gap-3 bg-[#fafafa] ring-[#03045e]/10">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#03045e] text-white shrink-0">
          <Landmark className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[#03045e]">Ghana chart of accounts</p>
          <p className="text-xs text-mocha mt-0.5">
            {accounts.length} accounts · GHS ledger · Sales, COGS, payroll, and expenses post
            automatically to these codes
          </p>
        </div>
      </AdminCard>

      {!visibleTypes.length ? (
        <AdminEmptyState message="No accounts match your search." />
      ) : (
        <div className="space-y-4">
          {visibleTypes.map((type) => {
            const meta = TYPE_META[type];
            const Icon = meta.icon;
            const rows = grouped.get(type) ?? [];
            let lastSubgroup: string | null = null;

            return (
              <AdminCard key={type} padding="none" className="overflow-hidden">
                <AdminSectionBar
                  title={meta.plural}
                  icon={Icon}
                  meta={`${rows.length} ${rows.length === 1 ? "account" : "accounts"}`}
                />

                <div className="divide-y divide-stone-100">
                  {rows.map((a) => {
                    const subgroup = subgroupLabel(type, a.code);
                    const showSubgroup = subgroup && subgroup !== lastSubgroup;
                    if (showSubgroup) lastSubgroup = subgroup;

                    return (
                      <div key={a.id}>
                        {showSubgroup ? (
                          <div className="px-4 sm:px-5 py-2 bg-[#fafafa] border-b border-stone-100">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-mocha font-medium">
                              {subgroup}
                            </p>
                          </div>
                        ) : null}
                        <div
                          className={cn(
                            "flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-5 py-3.5",
                            "border-l-[3px] hover:bg-[#fafafa]/80 transition-colors",
                            meta.rowAccent
                          )}
                        >
                          <div className="flex items-center gap-3 sm:w-28 shrink-0">
                            <span className="font-mono text-sm font-semibold text-[#03045e] tabular-nums">
                              {a.code}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-espresso">{a.name}</p>
                            {a.description ? (
                              <p className="text-xs text-mocha mt-0.5 leading-relaxed">
                                {a.description}
                              </p>
                            ) : null}
                          </div>
                          <span
                            className={cn(
                              "inline-flex self-start sm:self-center items-center rounded-full px-2.5 py-1",
                              "text-[10px] uppercase tracking-[0.12em] font-semibold ring-1",
                              meta.badge
                            )}
                          >
                            {meta.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
