"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type BranchOption = {
  id: string;
  name: string;
  country: string;
  active: boolean;
  isDefault: boolean;
};

export function OrderFulfillmentBranchSelect({
  orderId,
  currentBranchId,
  shippingCountry,
}: {
  orderId: string;
  currentBranchId: string | null;
  shippingCountry: string | null;
}) {
  const router = useRouter();
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [value, setValue] = useState(currentBranchId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/branches");
      const data = await res.json();
      if (!res.ok) return;
      const country = String(shippingCountry || "").toUpperCase();
      let list = (data.branches || []) as BranchOption[];
      list = list.filter((b) => b.active);
      if (country === "GH" || country === "CM") {
        list = list.filter((b) => b.country === country);
      }
      setBranches(list);
    })();
  }, [shippingCountry]);

  async function save(nextId: string) {
    setValue(nextId);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfillmentBranchId: nextId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not reassign");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="text-sm space-y-1">
      <label className="block font-medium text-espresso">Fulfilment branch</label>
      <select
        value={value}
        disabled={saving}
        onChange={(e) => void save(e.target.value)}
        className="w-full border border-wf-border px-3 py-2 text-sm bg-white"
      >
        <option value="">Unassigned</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name} ({b.country})
            {b.isDefault ? " · default" : ""}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
