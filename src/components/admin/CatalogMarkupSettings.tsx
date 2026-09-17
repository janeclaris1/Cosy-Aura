"use client";

import { useState } from "react";
import type { ProductType } from "@prisma/client";
import {
  AdminButton,
  AdminCard,
  AdminSectionTitle,
  AdminTableWrap,
  adminInputClass,
  adminLabelClass,
  adminTableClass,
  adminTdClass,
  adminThClass,
  adminTheadClass,
  adminTrClass,
} from "@/components/admin/admin-ui";
import { parseCatalogMarkupUsd, type CatalogMarkupUsd } from "@/lib/catalog-markup";
import {
  catalogForProductType,
  PRODUCT_TYPE_OPTIONS,
} from "@/lib/product-catalog";
import type { StoreConfigPayload } from "@/lib/store-config";

function catalogLabel(type: ProductType): string {
  return catalogForProductType(type).adminLabel;
}

export function CatalogMarkupSettings({
  initialMarkups,
  globalMarkupUsd,
}: {
  initialMarkups: CatalogMarkupUsd;
  globalMarkupUsd: number;
}) {
  const [markups, setMarkups] = useState<Record<ProductType, string>>(() => {
    const out = {} as Record<ProductType, string>;
    for (const option of PRODUCT_TYPE_OPTIONS) {
      const value = initialMarkups[option.value];
      out[option.value] = value != null ? String(value) : "";
    }
    return out;
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setMarkup(type: ProductType, raw: string) {
    setMarkups((current) => ({ ...current, [type]: raw }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload: CatalogMarkupUsd = {};
      for (const option of PRODUCT_TYPE_OPTIONS) {
        const raw = markups[option.value].trim();
        if (!raw) continue;
        const value = Number(raw);
        if (!Number.isFinite(value) || value < 0) {
          throw new Error(`Enter a valid USD amount for ${catalogLabel(option.value)}.`);
        }
        payload[option.value] = value;
      }

      const res = await fetch("/api/admin/store-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogMarkupUsd: payload }),
      });
      const data = (await res.json()) as StoreConfigPayload & { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save settings");

      const parsed = parseCatalogMarkupUsd(data.catalogMarkupUsd);
      const next = {} as Record<ProductType, string>;
      for (const option of PRODUCT_TYPE_OPTIONS) {
        const value = parsed[option.value];
        next[option.value] = value != null ? String(value) : "";
      }
      setMarkups(next);
      setMessage("Catalog markup saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminCard padding="lg" className="max-w-3xl">
      <AdminSectionTitle
        title="Markup by catalog"
        description={`Set a USD surcharge per catalog for shoppers outside Africa. Leave blank to use the global default ($${globalMarkupUsd}). Checkout and product pages apply these server-side.`}
        className="mb-4"
      />

      <AdminTableWrap>
        <table className={adminTableClass}>
          <thead className={adminTheadClass}>
            <tr>
              <th className={adminThClass}>Catalog</th>
              <th className={adminThClass}>USD surcharge</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCT_TYPE_OPTIONS.map((option) => (
              <tr key={option.value} className={adminTrClass}>
                <td className={adminTdClass}>{catalogLabel(option.value)}</td>
                <td className={adminTdClass}>
                  <label className="flex items-center gap-2">
                    <span className="text-sm text-mocha">$</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder={String(globalMarkupUsd)}
                      value={markups[option.value]}
                      onChange={(e) => setMarkup(option.value, e.target.value)}
                      className={`${adminInputClass} w-28`}
                    />
                    <span className={adminLabelClass}>blank = global</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableWrap>

      <div className="mt-4">
        <AdminButton type="button" disabled={saving} onClick={() => void save()}>
          Save catalog markups
        </AdminButton>
      </div>

      {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </AdminCard>
  );
}
