"use client";

import { useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminSectionTitle,
} from "@/components/admin/admin-ui";
import type { ProductType } from "@prisma/client";
import { parseGuestHiddenPriceCatalogs } from "@/lib/catalog-price-visibility";
import { PRODUCT_TYPE_OPTIONS } from "@/lib/product-catalog";
import type { StoreConfigPayload } from "@/lib/store-config";

const CATALOG_OPTIONS = PRODUCT_TYPE_OPTIONS.filter((o) => o.value !== "PERFUME");

export function GuestPriceVisibilitySettings({
  initialHidden,
}: {
  initialHidden: ProductType[];
}) {
  const [hidden, setHidden] = useState<ProductType[]>(initialHidden);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(type: ProductType) {
    setHidden((current) =>
      current.includes(type)
        ? current.filter((value) => value !== type)
        : [...current, type]
    );
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/store-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestHiddenPriceCatalogs: hidden }),
      });
      const data = (await res.json()) as StoreConfigPayload & { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save settings");
      setHidden(parseGuestHiddenPriceCatalogs(data.guestHiddenPriceCatalogs));
      setMessage("Guest price visibility saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminCard padding="lg" className="max-w-2xl">
      <AdminSectionTitle
        title="Guest price visibility"
        description="Hide list and product prices from visitors who are not signed in. Perfume prices are always visible. Signed-in customers always see prices."
      />

      <ul className="mt-6 space-y-3">
        {CATALOG_OPTIONS.map((option) => {
          const checked = hidden.includes(option.value);
          return (
            <li key={option.value}>
              <label className="flex cursor-pointer items-center gap-3 text-sm text-espresso">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(option.value)}
                  className="h-4 w-4 rounded border-stone-300 text-[#03045e] focus:ring-[#03045e]"
                />
                <span>
                  Hide {option.label.toLowerCase()} prices from guests
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex items-center gap-3">
        <AdminButton type="button" variant="primary" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save visibility"}
        </AdminButton>
        {hidden.length > 0 ? (
          <span className="text-sm text-mocha">
            {hidden.length} catalog{hidden.length === 1 ? "" : "s"} hidden for guests
          </span>
        ) : null}
      </div>

      {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </AdminCard>
  );
}
