"use client";

import { useEffect, useMemo, useState } from "react";
import { BOTTLE_SIZES, type BottleSize } from "@/lib/bottle-sizes";

type Branch = { id: string; name: string; country: string };
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
  const [adjustType, setAdjustType] = useState<"receive" | "damage" | "recount">(
    "receive"
  );
  const [adjustAmount, setAdjustAmount] = useState("1");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/branches");
      const data = await res.json();
      if (!res.ok) return;
      const list = (data.branches || []) as Branch[];
      setBranches(list);
      const params =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;
      const fromQuery = params?.get("branch") || "";
      const { readAdminBranchCookie } = await import("@/lib/admin-context");
      const fromCookie = readAdminBranchCookie() || "";
      if (fromQuery && list.some((b) => b.id === fromQuery)) {
        setBranchId(fromQuery);
      } else if (fromCookie && list.some((b) => b.id === fromCookie)) {
        setBranchId(fromCookie);
      } else if (list[0]) {
        setBranchId(list[0].id);
      }
    })();

    function onBranch(e: Event) {
      const detail = (e as CustomEvent<{ branchId?: string }>).detail;
      if (detail?.branchId) setBranchId(detail.branchId);
    }
    window.addEventListener("ca-admin-branch", onBranch);
    return () => window.removeEventListener("ca-admin-branch", onBranch);
  }, []);

  async function loadStock(id: string) {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/branches/${id}/stock`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not load stock");
      setRows([]);
      return;
    }
    const next = (data.rows || []) as Row[];
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
  }

  useEffect(() => {
    if (!branchId) return;
    void loadStock(branchId);
  }, [branchId]);

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

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selected[r.fragranceId]);

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
      `Set ${sizes.map((s) => `${s}ml`).join(", ")} to ${qty} on ${ids.length} product${ids.length === 1 ? "" : "s"}. Save to apply.`
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMessage(`Updated ${data.updated} products. Country pool synced.`);
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Adjustment failed");
      setMessage(
        `Adjustment saved: ${data.before} → ${data.after} (${data.delta >= 0 ? "+" : ""}${data.delta}).`
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          Branch
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="mt-1 block border border-wf-border px-3 py-2 text-sm min-w-[14rem]"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.country})
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm flex-1 min-w-[12rem]">
          Search
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Brand, model, reference…"
            className="mt-1 w-full border border-wf-border px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !branchId}
          className="btn-gold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-end border border-wf-border bg-wf-light/40 p-3">
        <p className="w-full text-xs text-mocha m-0">
          Bulk set: tick products below, choose sizes, enter a quantity, then Apply. Save when ready.
        </p>
        <label className="text-sm">
          Qty
          <input
            type="number"
            min={0}
            value={bulkQty}
            onChange={(e) => setBulkQty(e.target.value)}
            className="mt-1 block w-24 border border-wf-border px-2 py-1.5 text-sm bg-white"
          />
        </label>
        <div className="flex gap-3 items-center text-sm pt-5">
          {BOTTLE_SIZES.map((size) => (
            <label key={size} className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={bulkSizes[size]}
                onChange={(e) =>
                  setBulkSizes((prev) => ({ ...prev, [size]: e.target.checked }))
                }
              />
              {size}ml
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={applyBulk}
          className="border border-wf-border bg-white px-3 py-2 text-sm hover:bg-wf-light"
        >
          Apply to selected
        </button>
      </div>

      <form
        onSubmit={(e) => void applyAdjust(e)}
        className="flex flex-wrap gap-3 items-end border border-wf-border bg-white p-3"
      >
        <p className="w-full text-xs text-mocha m-0">
          Adjustment with reason (receive / damage / recount). Logged to Activity; low stock alerts when ≤ threshold.
        </p>
        <label className="text-sm flex-1 min-w-[14rem]">
          Product
          <select
            required
            value={adjustFragranceId}
            onChange={(e) => setAdjustFragranceId(e.target.value)}
            className="mt-1 block w-full border border-wf-border px-2 py-1.5 text-sm"
          >
            <option value="">Select…</option>
            {filtered.map((r) => (
              <option key={r.fragranceId} value={r.fragranceId}>
                {r.brand} {r.model}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Type
          <select
            value={adjustType}
            onChange={(e) =>
              setAdjustType(e.target.value as "receive" | "damage" | "recount")
            }
            className="mt-1 block border border-wf-border px-2 py-1.5 text-sm"
          >
            <option value="receive">Receive (+)</option>
            <option value="damage">Damage (−)</option>
            <option value="recount">Recount (set)</option>
          </select>
        </label>
        <label className="text-sm">
          Size
          <select
            value={adjustSize}
            onChange={(e) => setAdjustSize(Number(e.target.value) as BottleSize)}
            className="mt-1 block border border-wf-border px-2 py-1.5 text-sm"
          >
            {BOTTLE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}ml
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          {adjustType === "recount" ? "New qty" : "Amount"}
          <input
            required
            type="number"
            min={adjustType === "recount" ? 0 : 1}
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            className="mt-1 block w-24 border border-wf-border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm flex-1 min-w-[12rem]">
          Reason
          <input
            required
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            placeholder="Delivery note, breakage…"
            className="mt-1 w-full border border-wf-border px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={adjusting || !branchId}
          className="border border-wf-border bg-wf-light px-3 py-2 text-sm hover:bg-white disabled:opacity-50"
        >
          {adjusting ? "Saving…" : "Record adjustment"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}

      <div className="border border-wf-border bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="bg-wf-light">
            <tr>
              <th className="text-left p-3 font-medium w-10">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all filtered"
                />
              </th>
              <th className="text-left p-3 font-medium">Fragrance</th>
              {BOTTLE_SIZES.map((size) => (
                <th key={size} className="text-left p-3 font-medium">
                  {size}ml
                </th>
              ))}
              <th className="text-left p-3 font-medium">Country pool</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.fragranceId} className="border-t border-wf-border">
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
                  <span className="font-medium">
                    {row.brand} {row.model}
                  </span>
                  <span className="block text-xs text-mocha">{row.reference}</span>
                </td>
                {BOTTLE_SIZES.map((size) => (
                  <td key={size} className="p-3">
                    <input
                      type="number"
                      min={0}
                      value={draft[row.fragranceId]?.[size] ?? "0"}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [row.fragranceId]: {
                            ...(prev[row.fragranceId] || emptyDraftSizes()),
                            [size]: e.target.value,
                          },
                        }))
                      }
                      className="w-20 border border-wf-border px-2 py-1.5 text-sm"
                      aria-label={`${row.model} ${size}ml`}
                    />
                  </td>
                ))}
                <td className="p-3 text-mocha">
                  {row.countryPool}
                  {!row.countryInStock ? (
                    <span className="ml-2 text-xs text-red-600">offline</span>
                  ) : null}
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-mocha">
                  No products found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
