"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPrice } from "@/lib/utils";

type ShippingRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  eta: string;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  sortOrder: number;
  enabled: boolean;
};

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "5",
  eta: "5-10 business days",
  deliveryDaysMin: "5",
  deliveryDaysMax: "10",
  sortOrder: "0",
  enabled: true,
};

export function ShippingManager({ initialMethods }: { initialMethods: ShippingRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function createMethod(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/shipping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        price: Number(form.price),
        eta: form.eta,
        deliveryDaysMin: Number(form.deliveryDaysMin),
        deliveryDaysMax: Number(form.deliveryDaysMax),
        sortOrder: Number(form.sortOrder),
        enabled: form.enabled,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to create shipping method");
      setLoading(false);
      return;
    }

    setForm(EMPTY_FORM);
    setLoading(false);
    router.refresh();
  }

  async function saveMethod(method: ShippingRow) {
    const res = await fetch(`/api/admin/shipping/${method.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(method),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Update failed");
      return;
    }

    setEditingId(null);
    router.refresh();
  }

  async function deleteMethod(id: string, name: string) {
    if (!confirm(`Delete “${name}”?`)) return;

    const res = await fetch(`/api/admin/shipping/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Delete failed");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={createMethod}
        className="bg-white border border-wf-border rounded-lg p-5 space-y-4"
      >
        <h2 className="font-medium">Add shipping method</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="text-wf-gray">Name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Standard Shipping"
              className="mt-1 w-full px-4 py-2.5 border border-wf-border rounded text-sm focus:outline-none focus:border-gold"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-wf-gray">Price (USD)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              className="mt-1 w-full px-4 py-2.5 border border-wf-border rounded text-sm focus:outline-none focus:border-gold"
              required
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="text-wf-gray">Delivery estimate</span>
            <input
              value={form.eta}
              onChange={(e) => setForm((prev) => ({ ...prev, eta: e.target.value }))}
              placeholder="5-10 business days"
              className="mt-1 w-full px-4 py-2.5 border border-wf-border rounded text-sm focus:outline-none focus:border-gold"
              required
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="text-wf-gray">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              placeholder="Tracked delivery with discreet packaging"
              className="mt-1 w-full px-4 py-2.5 border border-wf-border rounded text-sm focus:outline-none focus:border-gold"
            />
          </label>
          <label className="block text-sm">
            <span className="text-wf-gray">Min business days</span>
            <input
              type="number"
              min="1"
              value={form.deliveryDaysMin}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, deliveryDaysMin: e.target.value }))
              }
              className="mt-1 w-full px-4 py-2.5 border border-wf-border rounded text-sm focus:outline-none focus:border-gold"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-wf-gray">Max business days</span>
            <input
              type="number"
              min="1"
              value={form.deliveryDaysMax}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, deliveryDaysMax: e.target.value }))
              }
              className="mt-1 w-full px-4 py-2.5 border border-wf-border rounded text-sm focus:outline-none focus:border-gold"
              required
            />
          </label>
        </div>
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
            />
            Enabled at checkout
          </label>
          <button type="submit" disabled={loading} className="btn-gold disabled:opacity-50">
            {loading ? "Adding..." : "Add Method"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <div className="border border-wf-border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-wf-light">
            <tr>
              <th className="text-left p-3 font-medium">Method</th>
              <th className="text-left p-3 font-medium">Price</th>
              <th className="text-left p-3 font-medium">ETA</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initialMethods.map((method) => (
              <ShippingRowEditor
                key={`${method.id}-${editingId === method.id}`}
                method={method}
                editing={editingId === method.id}
                onEdit={() => setEditingId(method.id)}
                onCancel={() => setEditingId(null)}
                onSave={saveMethod}
                onDelete={() => deleteMethod(method.id, method.name)}
              />
            ))}
          </tbody>
        </table>
        {initialMethods.length === 0 && (
          <p className="p-6 text-wf-gray text-sm">No shipping methods yet.</p>
        )}
      </div>
    </div>
  );
}

function ShippingRowEditor({
  method,
  editing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  method: ShippingRow;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (method: ShippingRow) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(method);

  if (!editing) {
    return (
      <tr className="border-t border-wf-border">
        <td className="p-3">
          <p className="font-medium">{method.name}</p>
          {method.description && (
            <p className="text-xs text-wf-gray mt-1">{method.description}</p>
          )}
        </td>
        <td className="p-3">{formatPrice(method.price)}</td>
        <td className="p-3">{method.eta}</td>
        <td className="p-3">
          <span
            className={
              method.enabled
                ? "text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs"
                : "text-wf-gray bg-wf-light px-2 py-0.5 rounded text-xs"
            }
          >
            {method.enabled ? "Enabled" : "Disabled"}
          </span>
        </td>
        <td className="p-3 space-x-3">
          <button type="button" onClick={onEdit} className="text-gold hover:underline">
            Edit
          </button>
          <button type="button" onClick={onDelete} className="text-red-600 hover:underline">
            Delete
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-wf-border bg-wf-light/40">
      <td className="p-3 space-y-2">
        <input
          value={draft.name}
          onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
          className="w-full px-3 py-2 border border-wf-border rounded text-sm"
        />
        <textarea
          value={draft.description || ""}
          onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 border border-wf-border rounded text-sm"
        />
      </td>
      <td className="p-3 align-top">
        <input
          type="number"
          min="0"
          step="0.01"
          value={draft.price}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, price: Number(e.target.value) }))
          }
          className="w-24 px-3 py-2 border border-wf-border rounded text-sm"
        />
      </td>
      <td className="p-3 align-top space-y-2">
        <input
          value={draft.eta}
          onChange={(e) => setDraft((prev) => ({ ...prev, eta: e.target.value }))}
          className="w-full px-3 py-2 border border-wf-border rounded text-sm"
        />
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            value={draft.deliveryDaysMin}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                deliveryDaysMin: Number(e.target.value),
              }))
            }
            className="w-16 px-2 py-2 border border-wf-border rounded text-sm"
          />
          <input
            type="number"
            min="1"
            value={draft.deliveryDaysMax}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                deliveryDaysMax: Number(e.target.value),
              }))
            }
            className="w-16 px-2 py-2 border border-wf-border rounded text-sm"
          />
        </div>
      </td>
      <td className="p-3 align-top">
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => setDraft((prev) => ({ ...prev, enabled: e.target.checked }))}
          />
          Enabled
        </label>
      </td>
      <td className="p-3 align-top space-x-3">
        <button
          type="button"
          onClick={() => onSave(draft)}
          className="text-gold hover:underline"
        >
          Save
        </button>
        <button type="button" onClick={onCancel} className="hover:underline">
          Cancel
        </button>
      </td>
    </tr>
  );
}
