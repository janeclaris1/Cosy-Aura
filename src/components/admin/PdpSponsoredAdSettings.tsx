"use client";

import { useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminSectionTitle,
  adminInputClass,
  adminLabelClass,
} from "@/components/admin/admin-ui";
import {
  parsePdpSponsoredAd,
  validatePdpSponsoredAd,
  type PdpSponsoredAdConfig,
} from "@/lib/pdp-sponsored-ad";
import type { StoreConfigPayload } from "@/lib/store-config";

type FormState = {
  enabled: boolean;
  videoUrl: string;
  posterImage: string;
  title: string;
  href: string;
  rating: string;
  reviewCount: string;
  discountPercent: string;
  dealLabel: string;
  priceGhs: string;
  originalPriceGhs: string;
};

function toFormState(config: PdpSponsoredAdConfig): FormState {
  return {
    enabled: config.enabled,
    videoUrl: config.videoUrl || "",
    posterImage: config.posterImage || "",
    title: config.title || "",
    href: config.href || "",
    rating: config.rating != null ? String(config.rating) : "",
    reviewCount: config.reviewCount != null ? String(config.reviewCount) : "",
    discountPercent: config.discountPercent != null ? String(config.discountPercent) : "",
    dealLabel: config.dealLabel || "",
    priceGhs: config.priceGhs != null ? String(config.priceGhs) : "",
    originalPriceGhs: config.originalPriceGhs != null ? String(config.originalPriceGhs) : "",
  };
}

function formToConfig(form: FormState): PdpSponsoredAdConfig {
  return parsePdpSponsoredAd({
    enabled: form.enabled,
    videoUrl: form.videoUrl,
    posterImage: form.posterImage,
    title: form.title,
    href: form.href,
    rating: form.rating,
    reviewCount: form.reviewCount,
    discountPercent: form.discountPercent,
    dealLabel: form.dealLabel,
    priceGhs: form.priceGhs,
    originalPriceGhs: form.originalPriceGhs,
  });
}

export function PdpSponsoredAdSettings({
  initialConfig,
}: {
  initialConfig: PdpSponsoredAdConfig;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(initialConfig));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    const config = formToConfig(form);
    const validationError = validatePdpSponsoredAd(config);
    if (validationError) {
      setError(validationError);
      setMessage(null);
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/store-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdpSponsoredAd: config }),
      });
      const data = (await res.json()) as StoreConfigPayload & { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save sponsored ad");
      setForm(toFormState(parsePdpSponsoredAd(data.pdpSponsoredAd)));
      setMessage("Sponsored product ad saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminCard padding="lg" className="max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <AdminSectionTitle
          title="Product page sponsored ad"
          description="Horizontal video ad shown below Shipping & Returns on every product page. Uses a poster image or YouTube thumbnail until the shopper taps play."
        />
        <button
          type="button"
          role="switch"
          aria-checked={form.enabled}
          disabled={saving}
          onClick={() => updateField("enabled", !form.enabled)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
            form.enabled ? "bg-[#03045e]" : "bg-stone-200/90"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              form.enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={adminLabelClass}>Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            className={adminInputClass}
            placeholder="Partner product name"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={adminLabelClass}>Link URL</label>
          <input
            type="url"
            value={form.href}
            onChange={(e) => updateField("href", e.target.value)}
            className={adminInputClass}
            placeholder="https://…"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={adminLabelClass}>Video URL</label>
          <input
            type="url"
            value={form.videoUrl}
            onChange={(e) => updateField("videoUrl", e.target.value)}
            className={adminInputClass}
            placeholder="YouTube link or direct MP4 URL"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={adminLabelClass}>Poster image URL (optional)</label>
          <input
            type="url"
            value={form.posterImage}
            onChange={(e) => updateField("posterImage", e.target.value)}
            className={adminInputClass}
            placeholder="https://… — falls back to YouTube thumbnail"
          />
        </div>

        <div>
          <label className={adminLabelClass}>Rating (0–5)</label>
          <input
            type="number"
            min={0}
            max={5}
            step={0.1}
            value={form.rating}
            onChange={(e) => updateField("rating", e.target.value)}
            className={adminInputClass}
          />
        </div>

        <div>
          <label className={adminLabelClass}>Review count</label>
          <input
            type="number"
            min={0}
            value={form.reviewCount}
            onChange={(e) => updateField("reviewCount", e.target.value)}
            className={adminInputClass}
          />
        </div>

        <div>
          <label className={adminLabelClass}>Discount %</label>
          <input
            type="number"
            min={0}
            max={100}
            value={form.discountPercent}
            onChange={(e) => updateField("discountPercent", e.target.value)}
            className={adminInputClass}
          />
        </div>

        <div>
          <label className={adminLabelClass}>Deal label</label>
          <input
            type="text"
            value={form.dealLabel}
            onChange={(e) => updateField("dealLabel", e.target.value)}
            className={adminInputClass}
            placeholder="Limited time deal"
          />
        </div>

        <div>
          <label className={adminLabelClass}>Price (GHS)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={form.priceGhs}
            onChange={(e) => updateField("priceGhs", e.target.value)}
            className={adminInputClass}
          />
        </div>

        <div>
          <label className={adminLabelClass}>Original price (GHS)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={form.originalPriceGhs}
            onChange={(e) => updateField("originalPriceGhs", e.target.value)}
            className={adminInputClass}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <AdminButton type="button" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save sponsored ad"}
        </AdminButton>
        <p className="text-xs text-mocha">
          Status: {form.enabled ? "Visible on product pages" : "Hidden"}
        </p>
      </div>

      {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </AdminCard>
  );
}
