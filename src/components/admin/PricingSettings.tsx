"use client";

import { useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminSectionTitle,
  adminInputClass,
  adminLabelClass,
} from "@/components/admin/admin-ui";

type PricingConfig = {
  nonAfricaMarkupEnabled: boolean;
  nonAfricaMarkupUsd: number;
};

export function PricingSettings({ initialConfig }: { initialConfig: PricingConfig }) {
  const [config, setConfig] = useState(initialConfig);
  const [markupUsd, setMarkupUsd] = useState(String(initialConfig.nonAfricaMarkupUsd));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(next: Partial<PricingConfig>) {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/store-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = (await res.json()) as PricingConfig & { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save settings");
      setConfig(data);
      setMarkupUsd(String(data.nonAfricaMarkupUsd));
      setMessage("Pricing settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled() {
    await save({ nonAfricaMarkupEnabled: !config.nonAfricaMarkupEnabled });
  }

  async function saveMarkup() {
    const value = Number(markupUsd);
    if (!Number.isFinite(value) || value < 0) {
      setError("Enter a valid markup amount (0 or greater).");
      return;
    }
    await save({ nonAfricaMarkupUsd: value });
  }

  return (
    <div className="max-w-2xl space-y-8">
      <AdminCard padding="lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <AdminSectionTitle
              title="International markup"
              description="When enabled, shoppers outside Africa see catalog prices plus a flat USD surcharge. African countries keep standard pricing. Checkout always recalculates server-side from the visitor's country."
            />
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.nonAfricaMarkupEnabled}
            disabled={saving}
            onClick={() => void toggleEnabled()}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
              config.nonAfricaMarkupEnabled ? "bg-[#03045e]" : "bg-stone-200/90"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                config.nonAfricaMarkupEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        <p className="mt-4 text-sm">
          Status:{" "}
          <span className={config.nonAfricaMarkupEnabled ? "text-green-700" : "text-mocha"}>
            {config.nonAfricaMarkupEnabled ? "Enabled" : "Disabled"}
          </span>
        </p>
      </AdminCard>

      <AdminCard padding="lg">
        <AdminSectionTitle
          title="Markup amount"
          description="Added to each product's USD-equivalent price for non-African visitors (e.g. $10 → a $10 product becomes $20)."
          className="mb-4"
        />
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className={adminLabelClass}>USD surcharge</span>
            <div className="flex items-center gap-2">
              <span className="text-sm">$</span>
              <input
                type="number"
                min={0}
                step={1}
                value={markupUsd}
                onChange={(e) => setMarkupUsd(e.target.value)}
                className={`${adminInputClass} w-28`}
              />
            </div>
          </label>
          <AdminButton type="button" disabled={saving} onClick={() => void saveMarkup()}>
            Save amount
          </AdminButton>
        </div>
      </AdminCard>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
