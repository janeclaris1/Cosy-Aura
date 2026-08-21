"use client";

import { useEffect, useMemo, useState } from "react";
import { BOTTLE_SIZES, type BottleSize } from "@/lib/bottle-sizes";
import { readAdminBranchCookie } from "@/lib/admin-context";

type Branch = { id: string; name: string; country: string };
type FragranceOption = {
  fragranceId: string;
  brand: string;
  model: string;
  reference: string;
  quantities: Record<BottleSize, number>;
};
type TransferRow = {
  id: string;
  bottleSize: number;
  quantity: number;
  reason: string | null;
  status: string;
  createdAt: string;
  fromBranch: { name: string; country: string };
  toBranch: { name: string; country: string };
  fragrance: {
    model: string;
    reference: string;
    brand: { name: string };
  };
  createdBy: { email: string; name: string | null } | null;
};

export function StockTransferManager() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [products, setProducts] = useState<FragranceOption[]>([]);
  const [fragranceId, setFragranceId] = useState("");
  const [bottleSize, setBottleSize] = useState<BottleSize>(50);
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [q, setQ] = useState("");
  const [history, setHistory] = useState<TransferRow[]>([]);
  const [threshold, setThreshold] = useState(20);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadBranches() {
    const res = await fetch("/api/admin/branches");
    const data = await res.json();
    if (!res.ok) return;
    const list = (data.branches || []) as Branch[];
    setBranches(list);
    const cookie = readAdminBranchCookie();
    const preferred =
      (cookie && list.some((b) => b.id === cookie) && cookie) || list[0]?.id || "";
    if (!fromBranchId && preferred) setFromBranchId(preferred);
    if (!toBranchId && list[1]) setToBranchId(list[1].id);
    else if (!toBranchId && list[0]) setToBranchId(list[0].id);
  }

  async function loadHistory(nextStatus = statusFilter) {
    const params = new URLSearchParams({ limit: "40" });
    if (nextStatus) params.set("status", nextStatus);
    const res = await fetch(`/api/admin/transfers?${params}`);
    const data = await res.json();
    if (res.ok) {
      setHistory(data.transfers || []);
      if (data.approvalThreshold) setThreshold(Number(data.approvalThreshold));
    }
  }

  async function loadProducts(branchId: string) {
    if (!branchId) return;
    const res = await fetch(`/api/admin/branches/${branchId}/stock`);
    const data = await res.json();
    if (!res.ok) {
      setProducts([]);
      return;
    }
    setProducts((data.rows || []) as FragranceOption[]);
  }

  useEffect(() => {
    void loadBranches();
    const params = new URLSearchParams(window.location.search);
    const st = params.get("status") || "";
    if (st) setStatusFilter(st.toUpperCase());
    void loadHistory(st ? st.toUpperCase() : "");
  }, []);

  useEffect(() => {
    void loadProducts(fromBranchId);
  }, [fromBranchId]);

  const filteredProducts = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) =>
        p.model.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        p.reference.toLowerCase().includes(term)
    );
  }, [products, q]);

  const selected = products.find((p) => p.fragranceId === fragranceId);
  const available = selected?.quantities?.[bottleSize] ?? 0;
  const qtyNum = Math.floor(Number(quantity) || 0);
  const willNeedApproval = requireApproval || qtyNum >= threshold;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromBranchId,
          toBranchId,
          fragranceId,
          bottleSize,
          quantity: Number(quantity),
          reason: reason || undefined,
          requireApproval,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transfer failed");
      setMessage(
        data.pending
          ? "Transfer submitted for approval."
          : "Transfer completed."
      );
      setQuantity("1");
      setReason("");
      setRequireApproval(false);
      await Promise.all([loadProducts(fromBranchId), loadHistory()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setSaving(false);
    }
  }

  async function decide(id: string, decision: "approve" | "reject") {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/transfers/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not update transfer");
      return;
    }
    setMessage(decision === "approve" ? "Transfer approved." : "Transfer rejected.");
    await loadHistory();
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={submit}
        className="grid md:grid-cols-2 gap-4 border border-wf-border bg-white p-4"
      >
        <p className="md:col-span-2 text-xs text-mocha m-0">
          Transfers of {threshold}+ units (or fulfilment staff) require manager
          approval before stock moves.
        </p>
        <label className="text-sm">
          From branch
          <select
            required
            value={fromBranchId}
            onChange={(e) => setFromBranchId(e.target.value)}
            className="mt-1 block w-full border border-wf-border px-3 py-2 text-sm"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.country})
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          To branch
          <select
            required
            value={toBranchId}
            onChange={(e) => setToBranchId(e.target.value)}
            className="mt-1 block w-full border border-wf-border px-3 py-2 text-sm"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.country})
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm md:col-span-2">
          Search product
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Brand, model, reference…"
            className="mt-1 w-full border border-wf-border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm md:col-span-2">
          Product
          <select
            required
            value={fragranceId}
            onChange={(e) => setFragranceId(e.target.value)}
            className="mt-1 block w-full border border-wf-border px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {filteredProducts.map((p) => (
              <option key={p.fragranceId} value={p.fragranceId}>
                {p.brand} {p.model} · {p.reference}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Size
          <select
            value={bottleSize}
            onChange={(e) => setBottleSize(Number(e.target.value) as BottleSize)}
            className="mt-1 block w-full border border-wf-border px-3 py-2 text-sm"
          >
            {BOTTLE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}ml (available: {selected?.quantities?.[s] ?? 0})
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Quantity
          <input
            required
            type="number"
            min={1}
            max={available || undefined}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="mt-1 block w-full border border-wf-border px-3 py-2 text-sm"
          />
          <span className="text-xs text-mocha">Available at source: {available}</span>
        </label>
        <label className="text-sm md:col-span-2">
          Reason {willNeedApproval ? "(required)" : "(optional)"}
          <input
            required={willNeedApproval}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rebalance, shortage, etc."
            className="mt-1 w-full border border-wf-border px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={requireApproval}
            onChange={(e) => setRequireApproval(e.target.checked)}
          />
          Require approval even if under threshold
        </label>
        {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
        {message && <p className="text-sm text-green-700 md:col-span-2">{message}</p>}
        <div className="md:col-span-2">
          <button type="submit" disabled={saving || !fragranceId} className="btn-gold disabled:opacity-50">
            {saving
              ? "Submitting…"
              : willNeedApproval
                ? "Request transfer"
                : "Transfer stock"}
          </button>
        </div>
      </form>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <h2 className="font-playfair text-xl m-0">Transfers</h2>
          <label className="text-sm">
            Status
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                void loadHistory(e.target.value);
              }}
              className="ml-2 border border-wf-border px-2 py-1.5 text-sm"
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>
        </div>
        <div className="border border-wf-border bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-wf-light">
              <tr>
                <th className="text-left p-3 font-medium">When</th>
                <th className="text-left p-3 font-medium">Product</th>
                <th className="text-left p-3 font-medium">Move</th>
                <th className="text-left p-3 font-medium">Qty</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id} className="border-t border-wf-border">
                  <td className="p-3 text-mocha whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3">
                    {row.fragrance.brand.name} {row.fragrance.model}
                    <span className="block text-xs text-mocha">
                      {row.bottleSize}ml · {row.fragrance.reference}
                    </span>
                  </td>
                  <td className="p-3">
                    {row.fromBranch.name} → {row.toBranch.name}
                  </td>
                  <td className="p-3">{row.quantity}</td>
                  <td className="p-3">
                    <span className="text-xs px-2 py-0.5 bg-wf-light rounded">
                      {row.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {row.status === "PENDING" ? (
                      <div className="flex gap-2 text-xs">
                        <button
                          type="button"
                          className="underline text-green-700"
                          onClick={() => void decide(row.id, "approve")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="underline text-red-600"
                          onClick={() => void decide(row.id, "reject")}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-mocha">
                        {row.createdBy?.name || row.createdBy?.email || "—"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!history.length ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-mocha">
                    No transfers yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
