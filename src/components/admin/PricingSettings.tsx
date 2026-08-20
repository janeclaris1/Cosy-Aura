"use client";

import { useState } from "react";

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
      <section className="border border-wf-border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-playfair text-xl mb-2">International markup</h2>
            <p className="text-sm text-wf-gray leading-relaxed">
              When enabled, shoppers outside Africa see catalog prices plus a flat USD
              surcharge. African countries keep standard pricing. Checkout always
              recalculates server-side from the visitor&apos;s country.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.nonAfricaMarkupEnabled}
            disabled={saving}
            onClick={() => void toggleEnabled()}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
              config.nonAfricaMarkupEnabled ? "bg-espresso" : "bg-wf-border"
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
          <span className={config.nonAfricaMarkupEnabled ? "text-green-700" : "text-wf-gray"}>
            {config.nonAfricaMarkupEnabled ? "Enabled" : "Disabled"}
          </span>
        </p>
      </section>

      <section className="border border-wf-border bg-white p-6">
        <h2 className="font-playfair text-xl mb-2">Markup amount</h2>
        <p className="text-sm text-wf-gray mb-4">
          Added to each product&apos;s USD-equivalent price for non-African visitors
          (e.g. $10 → a $10 product becomes $20).
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-wf-gray">USD surcharge</span>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm">$</span>
              <input
                type="number"
                min={0}
                step={1}
                value={markupUsd}
                onChange={(e) => setMarkupUsd(e.target.value)}
                className="border border-wf-border px-3 py-2 w-28 text-sm"
              />
            </div>
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveMarkup()}
            className="btn-primary text-sm px-4 py-2"
          >
            Save amount
          </button>
        </div>
      </section>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
