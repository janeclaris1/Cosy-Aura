"use client";

import { useEffect, useState } from "react";

type Branch = {
  id: string;
  name: string;
  slug: string;
  country: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  active: boolean;
  isDefault: boolean;
  whatsappPhone: string | null;
  codEnabled: boolean;
  pickupEnabled: boolean;
  dawuroboEnabled: boolean;
  shaqexpressEnabled: boolean;
  openingHours: string | null;
  deliveryNotes: string | null;
  _count?: { staffAssignments: number; orders: number };
};

const empty = {
  name: "",
  country: "GH",
  city: "",
  address: "",
  phone: "",
  active: true,
  isDefault: false,
  whatsappPhone: "",
  codEnabled: true,
  pickupEnabled: false,
  dawuroboEnabled: true,
  shaqexpressEnabled: true,
  openingHours: "",
  deliveryNotes: "",
};

export function BranchesManager() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/branches");
    const data = await res.json();
    if (res.ok) setBranches(data.branches || []);
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(branch: Branch) {
    setEditingId(branch.id);
    setForm({
      name: branch.name,
      country: branch.country,
      city: branch.city || "",
      address: branch.address || "",
      phone: branch.phone || "",
      active: branch.active,
      isDefault: branch.isDefault,
      whatsappPhone: branch.whatsappPhone || "",
      codEnabled: branch.codEnabled !== false,
      pickupEnabled: Boolean(branch.pickupEnabled),
      dawuroboEnabled: branch.dawuroboEnabled !== false,
      shaqexpressEnabled: branch.shaqexpressEnabled !== false,
      openingHours: branch.openingHours || "",
      deliveryNotes: branch.deliveryNotes || "",
    });
    setError(null);
  }

  function reset() {
    setEditingId(null);
    setForm(empty);
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        editingId ? `/api/admin/branches/${editingId}` : "/api/admin/branches",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save branch");
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this branch? Prefer deactivating if it has history.")) return;
    const res = await fetch(`/api/admin/branches/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not delete");
      return;
    }
    await load();
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <form onSubmit={save} className="space-y-3 bg-white border border-wf-border p-4">
        <h2 className="font-medium text-sm">
          {editingId ? "Edit branch" : "Add branch"}
        </h2>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <label className="block text-sm">
          Name
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full border border-wf-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          Country
          <select
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className="mt-1 w-full border border-wf-border px-3 py-2 text-sm"
          >
            <option value="GH">Ghana (GH)</option>
            <option value="CM">Cameroon (CM)</option>
          </select>
        </label>
        <label className="block text-sm">
          City
          <input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="mt-1 w-full border border-wf-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          Address
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="mt-1 w-full border border-wf-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          Phone
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="mt-1 w-full border border-wf-border px-3 py-2 text-sm"
          />
        </label>

        <div className="border-t border-wf-border pt-3 space-y-3">
          <p className="text-xs text-mocha">
            Commerce (default branch for a country drives checkout WhatsApp, COD & couriers)
          </p>
          <label className="block text-sm">
            WhatsApp override
            <input
              value={form.whatsappPhone}
              onChange={(e) => setForm({ ...form, whatsappPhone: e.target.value })}
              placeholder="e.g. 23324… (blank = store settings)"
              className="mt-1 w-full border border-wf-border px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            Opening hours
            <input
              value={form.openingHours}
              onChange={(e) => setForm({ ...form, openingHours: e.target.value })}
              placeholder="Mon–Sat 9:00–18:00"
              className="mt-1 w-full border border-wf-border px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            Delivery / pickup notes
            <textarea
              value={form.deliveryNotes}
              onChange={(e) => setForm({ ...form, deliveryNotes: e.target.value })}
              rows={2}
              className="mt-1 w-full border border-wf-border px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.codEnabled}
              onChange={(e) => setForm({ ...form, codEnabled: e.target.checked })}
            />
            Allow cash on delivery
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.pickupEnabled}
              onChange={(e) => setForm({ ...form, pickupEnabled: e.target.checked })}
            />
            Offer pickup at this shop
          </label>
          {form.country === "GH" ? (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.dawuroboEnabled}
                  onChange={(e) => setForm({ ...form, dawuroboEnabled: e.target.checked })}
                />
                Offer Dawurobo (Greater Accra)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.shaqexpressEnabled}
                  onChange={(e) =>
                    setForm({ ...form, shaqexpressEnabled: e.target.checked })
                  }
                />
                Offer ShaQ Express
              </label>
            </>
          ) : null}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
          />
          Default fulfilment branch for this country
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Active
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-gold disabled:opacity-50">
            {saving ? "Saving…" : editingId ? "Update" : "Create"}
          </button>
          {editingId ? (
            <button type="button" onClick={reset} className="text-sm text-mocha">
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="space-y-3">
        {branches.map((branch) => (
          <div
            key={branch.id}
            className="bg-white border border-wf-border p-4 flex justify-between gap-4"
          >
            <div>
              <p className="font-medium text-sm">
                {branch.name}{" "}
                <span className="text-mocha font-normal">· {branch.country}</span>
              </p>
              <p className="text-xs text-mocha mt-1">
                {[branch.city, branch.address].filter(Boolean).join(" · ") || "No address"}
              </p>
              <p className="text-xs text-mocha mt-1">
                {branch.isDefault ? "Default fulfilment · " : ""}
                {branch.active ? "Active" : "Inactive"}
                {branch.codEnabled === false ? " · COD off" : ""}
                {branch.pickupEnabled ? " · Pickup" : ""}
                {branch._count
                  ? ` · ${branch._count.staffAssignments} staff · ${branch._count.orders} orders`
                  : ""}
              </p>
            </div>
            <div className="flex flex-col gap-2 text-xs shrink-0">
              <button type="button" onClick={() => startEdit(branch)} className="underline">
                Edit
              </button>
              <button
                type="button"
                onClick={() => void remove(branch.id)}
                className="underline text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {!branches.length ? (
          <p className="text-sm text-mocha">No branches yet.</p>
        ) : null}
      </div>
    </div>
  );
}
