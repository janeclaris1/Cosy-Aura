"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Loader2,
  Package,
  RefreshCw,
  Save,
  Search,
  Warehouse,
} from "lucide-react";
import { BOTTLE_SIZES, type BottleSize } from "@/lib/bottle-sizes";
import { cn } from "@/lib/utils";
import { readAdminBranchCookie, writeAdminBranchCookie } from "@/lib/admin-context";
import { AdminBranchSelect } from "@/components/admin/AdminBranchSelect";
import {
  AdminButton,
  AdminSectionTitle,
  adminInputClass,
  adminLabelClass,
  adminSelectClass,
} from "@/components/admin/admin-ui";

const LOW_STOCK_THRESHOLD = 5;

type Branch = { id: string; name: string; country: string; isDefault?: boolean };
type Quantities = Record<BottleSize, number>;
type Row = {
  fragranceId: string;
  brand: string;
  model: string;
  reference: string;
  quantities: Quantities;
  countryPool: number;
  countryInStock: boolean;
};

type DraftMap = Record<string, Record<BottleSize, string>>;

function emptyDraftSizes(): Record<BottleSize, string> {
  return { 30: "0", 50: "0", 100: "0" };
}

const inputClass =
  "w-full bg-[#fafafa] border border-stone-200/90 px-3 py-2.5 text-sm text-espresso focus:outline-none focus:border-[#03045e]/40 focus:bg-white transition-colors";
const labelClass = "block text-[10px] uppercase tracking-[0.16em] text-mocha mb-1.5";
const qtyInputClass =
  "w-full max-w-[4.5rem] border border-stone-200/90 px-2 py-1.5 text-sm text-center tabular-nums focus:outline-none focus:border-[#03045e]/40 bg-white";

function qtyTone(qty: number): string {
  if (qty <= 0) return "bg-red-50 ring-1 ring-red-200/80 text-red-800";
  if (qty <= LOW_STOCK_THRESHOLD) return "bg-amber-50 ring-1 ring-amber-200/80 text-amber-900";
  return "bg-white border-stone-200/90";
}

async function readJson<T extends Record<string, unknown>>(
  res: Response
): Promise<{ data: T | null; error: string | null }> {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {
      data: null,
      error: res.ok ? "Unexpected response" : `Request failed (${res.status})`,
    };
  }
  try {
    return { data: (await res.json()) as T, error: null };
  } catch {
    return { data: null, error: "Invalid JSON response" };
  }
}

export function BranchStockManager() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState<DraftMap>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkQty, setBulkQty] = useState("0");
  const [bulkSizes, setBulkSizes] = useState<Record<BottleSize, boolean>>({
    30: true,
    50: true,
    100: true,
  });
  const [adjustFragranceId, setAdjustFragranceId] = useState("");
  const [adjustSize, setAdjustSize] = useState<BottleSize>(50);
  const [adjustType, setAdjustType] = useState<"receive" | "damage" | "recount">("receive");
  const [adjustAmount, setAdjustAmount] = useState("1");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBranches(attempt = 0) {
      setLoadingBranches(true);
      setBranchError(null);
      const res = await fetch("/api/admin/context");
      if (cancelled) return;

      if (!res.ok) {
        if (attempt < 3) {
          window.setTimeout(() => void loadBranches(attempt + 1), 400 * (attempt + 1));
          return;
        }
        setBranchError("Could not load branches. Refresh the page.");
        setLoadingBranches(false);
        return;
      }

      const { data, error: parseError } = await readJson<{ branches?: Branch[] }>(res);
      if (parseError || !data) {
        setBranchError(parseError || "Could not load branches");
        setLoadingBranches(false);
        return;
      }

      const list = data.branches || [];
      setBranches(list);

      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get("branch") || "";
      const fromCookie = readAdminBranchCookie() || "";
      const pick =
        (fromQuery && list.some((b) => b.id === fromQuery) && fromQuery) ||
        (fromCookie && list.some((b) => b.id === fromCookie) && fromCookie) ||
        list.find((b) => b.isDefault)?.id ||
        list[0]?.id ||
        "";

      setBranchId(pick);
      if (!list.length) {
        setBranchError("No branch assigned to your account. Ask an admin to add you to a branch.");
      }
      setLoadingBranches(false);
    }

    void loadBranches();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (branchId) writeAdminBranchCookie(branchId);
  }, [branchId]);

  const loadStock = useCallback(async (id: string) => {
    setLoadingStock(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/branches/${id}/stock`);
      const { data, error: parseError } = await readJson<{ rows?: Row[]; error?: string }>(res);
      if (parseError || !data) {
        setError(parseError || "Could not load stock");
        setRows([]);
        return;
      }
      if (!res.ok) {
        setError(data.error || "Could not load stock");
        setRows([]);
        return;
      }

      const next = data.rows || [];
      setRows(next);
      const map: DraftMap = {};
      for (const row of next) {
        map[row.fragranceId] = {
          30: String(row.quantities?.[30] ?? 0),
          50: String(row.quantities?.[50] ?? 0),
          100: String(row.quantities?.[100] ?? 0),
        };
      }
      setDraft(map);
      setSelected({});
    } finally {
      setLoadingStock(false);
    }
  }, []);

  useEffect(() => {
    if (!branchId) return;
    void loadStock(branchId);
  }, [branchId, loadStock]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.model.toLowerCase().includes(term) ||
        r.brand.toLowerCase().includes(term) ||
        r.reference.toLowerCase().includes(term)
    );
  }, [rows, q]);

  const stats = useMemo(() => {
    let lowLines = 0;
    let totalUnits = 0;
    for (const row of rows) {
      for (const size of BOTTLE_SIZES) {
        const qty = Math.max(
          0,
          Math.floor(Number(draft[row.fragranceId]?.[size] ?? row.quantities[size] ?? 0) || 0)
        );
        totalUnits += qty;
        if (qty <= LOW_STOCK_THRESHOLD) lowLines++;
      }
    }
    return { products: rows.length, lowLines, totalUnits };
  }, [rows, draft]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selected[r.fragranceId]);

  const branch = branches.find((b) => b.id === branchId);
  const dirtyCount = useMemo(() => {
    let n = 0;
    for (const row of rows) {
      for (const size of BOTTLE_SIZES) {
        const current = Math.max(
          0,
          Math.floor(Number(draft[row.fragranceId]?.[size] ?? row.quantities[size] ?? 0) || 0)
        );
        if (current !== (row.quantities?.[size] ?? 0)) n++;
      }
    }
    return n;
  }, [rows, draft]);

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = { ...prev };
        for (const r of filtered) delete next[r.fragranceId];
        return next;
      });
      return;
    }
    setSelected((prev) => {
      const next = { ...prev };
      for (const r of filtered) next[r.fragranceId] = true;
      return next;
    });
  }

  function applyBulk() {
    const qty = Math.max(0, Math.floor(Number(bulkQty) || 0));
    const ids = Object.keys(selected).filter((id) => selected[id]);
    if (!ids.length) {
      setError("Select at least one product to bulk set.");
      setMessage(null);
      return;
    }
    const sizes = BOTTLE_SIZES.filter((s) => bulkSizes[s]);
    if (!sizes.length) {
      setError("Choose at least one bottle size for bulk set.");
      setMessage(null);
      return;
    }
    setError(null);
    setDraft((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        const current = { ...(next[id] || emptyDraftSizes()) };
        for (const size of sizes) current[size] = String(qty);
        next[id] = current;
      }
      return next;
    });
    setMessage(
      `Draft: ${sizes.map((s) => `${s}ml`).join(", ")} → ${qty} on ${ids.length} product${ids.length === 1 ? "" : "s"}. Click Save changes.`
    );
  }

  async function save() {
    if (!branchId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updates: Array<{
        fragranceId: string;
        bottleSize: BottleSize;
        quantity: number;
      }> = [];
      for (const row of rows) {
        for (const size of BOTTLE_SIZES) {
          const quantity = Math.max(
            0,
            Math.floor(Number(draft[row.fragranceId]?.[size] ?? row.quantities[size] ?? 0) || 0)
          );
          const original = row.quantities?.[size] ?? 0;
          if (quantity !== original) {
            updates.push({ fragranceId: row.fragranceId, bottleSize: size, quantity });
          }
        }
      }
      if (!updates.length) {
        setMessage("No changes to save.");
        return;
      }
      const res = await fetch(`/api/admin/branches/${branchId}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const { data, error: parseError } = await readJson<{ error?: string; updated?: number }>(
        res
      );
      if (parseError || !res.ok) {
        throw new Error(data?.error || parseError || "Save failed");
      }
      setMessage(`Saved ${data?.updated ?? 0} product(s). Country pool synced.`);
      await loadStock(branchId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function applyAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!branchId || !adjustFragranceId) return;
    setAdjusting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/branches/${branchId}/stock/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fragranceId: adjustFragranceId,
          bottleSize: adjustSize,
          type: adjustType,
          amount: Number(adjustAmount),
          reason: adjustReason,
        }),
      });
      const { data, error: parseError } = await readJson<{
        error?: string;
        before?: number;
        after?: number;
        delta?: number;
      }>(res);
      if (parseError || !res.ok) {
        throw new Error(data?.error || parseError || "Adjustment failed");
      }
      setMessage(
        `Adjustment logged: ${data?.before} → ${data?.after} (${(data?.delta ?? 0) >= 0 ? "+" : ""}${data?.delta}).`
      );
      setAdjustReason("");
      await loadStock(branchId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adjustment failed");
    } finally {
      setAdjusting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <section className="bg-white shadow-sm ring-1 ring-black/[0.04] p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1 grid sm:grid-cols-2 gap-4">
            <AdminBranchSelect
              branches={branches}
              value={branchId}
              onChange={setBranchId}
              disabled={loadingBranches}
              className="min-w-0 w-full"
            />
            <div>
              <label className={labelClass}>Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mocha" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Brand, model, reference…"
                  className={cn(inputClass, "pl-10")}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => branchId && void loadStock(branchId)}
              disabled={!branchId || loadingStock}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm border border-stone-200/90 hover:bg-[#fafafa] disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", loadingStock && "animate-spin")} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !branchId || dirtyCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm bg-[#03045e] text-white hover:bg-[#02033f] disabled:opacity-40"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save changes
              {dirtyCount > 0 ? ` (${dirtyCount})` : ""}
            </button>
          </div>
        </div>

        {loadingBranches && (
          <p className="text-xs text-mocha mt-3 inline-flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading branches…
          </p>
        )}
        {branchError && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 mt-3">
            {branchError}
          </p>
        )}
        {branch && !branchError && (
          <p className="text-xs text-mocha mt-3">
            Managing stock at <strong>{branch.name}</strong> · POS deducts from this branch
          </p>
        )}
      </section>

      {/* Stats */}
      {rows.length > 0 && (
        <section className="grid sm:grid-cols-3 gap-4">
          <StatTile icon={Package} label="Products" value={String(stats.products)} />
          <StatTile
            icon={Warehouse}
            label="Units on hand"
            value={String(stats.totalUnits)}
          />
          <StatTile
            icon={AlertTriangle}
            label={`Low / out (≤${LOW_STOCK_THRESHOLD})`}
            value={String(stats.lowLines)}
            accent={stats.lowLines > 0}
          />
        </section>
      )}

      {/* Bulk set */}
      <section className="bg-white shadow-sm ring-1 ring-black/[0.04] p-4 sm:p-5 space-y-3">
        <h2 className="font-playfair text-lg text-[#03045e]">Bulk set</h2>
        <p className="text-xs text-mocha">
          Tick products in the table, choose sizes, enter quantity, then Apply. Save when ready.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-24">
            <label className={labelClass}>Quantity</label>
            <input
              type="number"
              min={0}
              value={bulkQty}
              onChange={(e) => setBulkQty(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex gap-4 items-center pt-5">
            {BOTTLE_SIZES.map((size) => (
              <label key={size} className="inline-flex items-center gap-2 text-sm text-espresso">
                <input
                  type="checkbox"
                  checked={bulkSizes[size]}
                  onChange={(e) =>
                    setBulkSizes((prev) => ({ ...prev, [size]: e.target.checked }))
                  }
                  className="rounded border-stone-300"
                />
                {size} ml
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={applyBulk}
            className="px-4 py-2.5 text-sm border border-[#03045e]/30 text-[#03045e] hover:bg-[#03045e]/5"
          >
            Apply to selected
          </button>
        </div>
      </section>

      {/* Adjustment */}
      <section className="bg-white shadow-sm ring-1 ring-black/[0.04] p-4 sm:p-5">
        <AdminSectionTitle
          title="Stock adjustment"
          description={`Receive, damage, or recount with a reason — logged to Activity. Alerts fire when ≤ ${LOW_STOCK_THRESHOLD} units.`}
        />

        <form onSubmit={(e) => void applyAdjust(e)} className="space-y-5">
          <div>
            <p className={adminLabelClass}>Adjustment type</p>
            <div className="inline-flex flex-wrap p-1 bg-[#fafafa] ring-1 ring-stone-200/80 gap-0.5">
              {(
                [
                  { id: "receive" as const, label: "Receive", hint: "+" },
                  { id: "damage" as const, label: "Damage", hint: "−" },
                  { id: "recount" as const, label: "Recount", hint: "set" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAdjustType(t.id)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium transition-colors",
                    adjustType === t.id
                      ? "bg-white text-[#03045e] shadow-sm ring-1 ring-stone-200/80"
                      : "text-mocha hover:text-[#03045e]"
                  )}
                >
                  {t.label}
                  <span className="ml-1.5 text-[10px] font-normal text-mocha/80">
                    {t.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={adminLabelClass}>Product</label>
              <select
                required
                value={adjustFragranceId}
                onChange={(e) => setAdjustFragranceId(e.target.value)}
                className={cn(adminSelectClass, "appearance-none cursor-pointer")}
              >
                <option value="">Select a fragrance…</option>
                {filtered.map((r) => (
                  <option key={r.fragranceId} value={r.fragranceId}>
                    {r.brand} · {r.model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className={adminLabelClass}>Bottle size</p>
              <div className="flex flex-wrap gap-2">
                {BOTTLE_SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setAdjustSize(s)}
                    className={cn(
                      "min-w-[4.5rem] px-3 py-2.5 text-sm font-medium ring-1 transition-colors tabular-nums",
                      adjustSize === s
                        ? "bg-[#03045e] text-white ring-[#03045e]"
                        : "bg-white text-mocha ring-stone-200/80 hover:ring-[#03045e]/30"
                    )}
                  >
                    {s} ml
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={adminLabelClass}>
                {adjustType === "recount" ? "New quantity" : "Amount"}
              </label>
              <input
                required
                type="number"
                min={adjustType === "recount" ? 0 : 1}
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className={cn(adminInputClass, "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none")}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={adminLabelClass}>Reason</label>
              <input
                required
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Delivery note, damage report, stock count…"
                className={adminInputClass}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-stone-100">
            <p className="text-xs text-mocha mr-auto hidden sm:block">
              {adjustType === "receive" && "Adds units to branch stock"}
              {adjustType === "damage" && "Removes units from branch stock"}
              {adjustType === "recount" && "Sets exact quantity at this branch"}
            </p>
            <AdminButton type="submit" disabled={adjusting || !branchId}>
              {adjusting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Record adjustment"
              )}
            </AdminButton>
          </div>
        </form>
      </section>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3">{error}</p>
      )}
      {message && (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 px-4 py-3">
          {message}
        </p>
      )}

      {/* Table */}
      <section className="bg-white shadow-sm ring-1 ring-black/[0.04] overflow-hidden">
        {loadingStock ? (
          <div className="flex items-center justify-center gap-2 py-16 text-mocha text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading stock…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[880px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-mocha bg-[#fafafa] border-b border-stone-100">
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all filtered"
                    />
                  </th>
                  <th className="p-3 font-medium">Fragrance</th>
                  {BOTTLE_SIZES.map((size) => (
                    <th key={size} className="p-3 font-medium w-28">
                      {size} ml
                    </th>
                  ))}
                  <th className="p-3 font-medium w-28">Country pool</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((row) => (
                  <tr key={row.fragranceId} className="hover:bg-[#fafafa]/60">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={!!selected[row.fragranceId]}
                        onChange={(e) =>
                          setSelected((prev) => ({
                            ...prev,
                            [row.fragranceId]: e.target.checked,
                          }))
                        }
                        aria-label={`Select ${row.brand} ${row.model}`}
                      />
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/admin/fragrances/${row.fragranceId}/edit`}
                        className="font-medium text-[#03045e] hover:underline"
                      >
                        {row.brand} · {row.model}
                      </Link>
                      <p className="text-xs text-mocha mt-0.5">{row.reference}</p>
                    </td>
                    {BOTTLE_SIZES.map((size) => {
                      const val = draft[row.fragranceId]?.[size] ?? "0";
                      const qty = Math.max(0, Math.floor(Number(val) || 0));
                      return (
                        <td key={size} className="p-3">
                          <input
                            type="number"
                            min={0}
                            value={val}
                            onChange={(e) =>
                              setDraft((prev) => ({
                                ...prev,
                                [row.fragranceId]: {
                                  ...(prev[row.fragranceId] || emptyDraftSizes()),
                                  [size]: e.target.value,
                                },
                              }))
                            }
                            className={cn(qtyInputClass, qtyTone(qty))}
                            aria-label={`${row.model} ${size}ml`}
                          />
                        </td>
                      );
                    })}
                    <td className="p-3 tabular-nums text-mocha">
                      {row.countryPool}
                      {!row.countryInStock && (
                        <span className="ml-1 text-[10px] uppercase text-red-600">offline</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-mocha">
                      {!branchId
                        ? "Select a branch to view stock."
                        : q.trim()
                          ? `No products match “${q.trim()}”.`
                          : rows.length === 0
                            ? "No products in catalogue."
                            : "No products found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-[10px] text-mocha">
        Amber = low stock (≤{LOW_STOCK_THRESHOLD}) · Red = out of stock · Country pool syncs when you
        save
      </p>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-white shadow-sm ring-1 ring-black/[0.04] px-4 py-4 flex items-center gap-3",
        accent && "ring-amber-200/70"
      )}
    >
      <div
        className={cn(
          "rounded-full p-2.5 shrink-0",
          accent ? "bg-amber-50 text-amber-800" : "bg-[#03045e]/5 text-[#03045e]"
        )}
      >
        <Icon className="w-4 h-4" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.14em] text-mocha">{label}</p>
        <p className="font-playfair text-2xl text-[#03045e] tabular-nums leading-none mt-1">
          {value}
        </p>
      </div>
    </div>
  );
}
