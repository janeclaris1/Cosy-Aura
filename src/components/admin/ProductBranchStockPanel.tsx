"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { BOTTLE_SIZES, type BottleSize } from "@/lib/bottle-sizes";
import { adminInputClass } from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";
import type { ProductType } from "@prisma/client";
import { isPerfumeProduct } from "@/lib/product-catalog";

type BranchRow = {
  id: string;
  name: string;
  country: string;
  quantities: Record<BottleSize, number>;
};

type DraftMap = Record<string, Record<BottleSize, string>>;

function emptySizes(): Record<BottleSize, string> {
  return { 30: "0", 50: "0", 100: "0" };
}

export function ProductBranchStockPanel({
  fragranceId,
  productType,
}: {
  fragranceId: string;
  productType: ProductType;
}) {
  const perfume = isPerfumeProduct(productType);
  const sizes: BottleSize[] = perfume ? [...BOTTLE_SIZES] : [50];

  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [draft, setDraft] = useState<DraftMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/fragrances/${fragranceId}/branch-stock`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load stock");
      const rows: BranchRow[] = data.branches || [];
      setBranches(rows);
      const map: DraftMap = {};
      for (const row of rows) {
        map[row.id] = {
          30: String(row.quantities[30] ?? 0),
          50: String(row.quantities[50] ?? 0),
          100: String(row.quantities[100] ?? 0),
        };
      }
      setDraft(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load stock");
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [fragranceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = branches.some((row) =>
    sizes.some((size) => {
      const current = Math.max(
        0,
        Math.floor(Number(draft[row.id]?.[size] ?? row.quantities[size] ?? 0) || 0)
      );
      return current !== (row.quantities[size] ?? 0);
    })
  );

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updates: Array<{ branchId: string; bottleSize: BottleSize; quantity: number }> =
        [];
      for (const row of branches) {
        for (const size of sizes) {
          const quantity = Math.max(
            0,
            Math.floor(Number(draft[row.id]?.[size] ?? row.quantities[size] ?? 0) || 0)
          );
          if (quantity !== (row.quantities[size] ?? 0)) {
            updates.push({ branchId: row.id, bottleSize: size, quantity });
          }
        }
      }
      if (!updates.length) {
        setMessage("No changes to save.");
        return;
      }
      const res = await fetch(`/api/admin/fragrances/${fragranceId}/branch-stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMessage("Branch stock saved. Country pools synced.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ring-1 ring-black/[0.04] bg-[#fafafa] p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-espresso">Branch inventory</p>
          <p className="text-xs text-mocha mt-0.5">
            {perfume
              ? "Quantities per branch for 30 / 50 / 100 ml. POS deducts from the selling branch."
              : "Units on hand at each branch. Stored on the unit barcode slot (50 ml)."}
          </p>
        </div>
        <Link
          href="/admin/stock"
          className="text-xs font-medium text-[#03045e] hover:underline shrink-0"
        >
          Open full stock manager →
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-mocha inline-flex items-center gap-2 py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading branch stock…
        </p>
      ) : branches.length === 0 ? (
        <p className="text-sm text-mocha">No branches assigned to your account.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[320px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-mocha border-b border-stone-200/80">
                <th className="py-2 pr-3 font-medium">Branch</th>
                {sizes.map((size) => (
                  <th key={size} className="py-2 px-2 font-medium w-24">
                    {perfume ? `${size} ml` : "Units"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {branches.map((row) => (
                <tr key={row.id}>
                  <td className="py-2.5 pr-3">
                    <span className="font-medium text-espresso">{row.name}</span>
                    <span className="text-xs text-mocha ml-1">({row.country})</span>
                  </td>
                  {sizes.map((size) => (
                    <td key={size} className="py-2 px-2">
                      <input
                        type="number"
                        min={0}
                        value={draft[row.id]?.[size] ?? "0"}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [row.id]: {
                              ...(prev[row.id] || emptySizes()),
                              [size]: e.target.value,
                            },
                          }))
                        }
                        className={cn(adminInputClass, "text-center tabular-nums py-2")}
                        aria-label={`${row.name} ${perfume ? `${size}ml` : "units"}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">{error}</p>
      )}
      {message && (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2">
          {message}
        </p>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || loading || !dirty}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-[#03045e] text-white hover:bg-[#02033f] disabled:opacity-40"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save branch stock
        </button>
      </div>
    </div>
  );
}
