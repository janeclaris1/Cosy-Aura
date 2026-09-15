"use client";

import { adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";
import type { PdpSponsoredAdFormState } from "@/lib/pdp-sponsored-ad";

export function ProductSponsoredAdFormFields({
  value,
  onChange,
}: {
  value: PdpSponsoredAdFormState;
  onChange: (next: PdpSponsoredAdFormState) => void;
}) {
  function update<K extends keyof PdpSponsoredAdFormState>(
    key: K,
    field: PdpSponsoredAdFormState[K]
  ) {
    onChange({ ...value, [key]: field });
  }

  return (
    <div className="ring-1 ring-black/[0.04] space-y-4 bg-[#fafafa] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Product page sponsored ad</p>
          <p className="mt-0.5 text-xs text-mocha">
            Chromeless autoplay video below Product details on this item&apos;s
            storefront page only.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value.enabled}
          onClick={() => update("enabled", !value.enabled)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
            value.enabled ? "bg-[#03045e]" : "bg-stone-200/90"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              value.enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={adminLabelClass}>Ad title</label>
          <input
            type="text"
            value={value.title}
            onChange={(e) => update("title", e.target.value)}
            className={adminInputClass}
            placeholder="Partner product name"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={adminLabelClass}>Ad link URL</label>
          <input
            type="url"
            value={value.href}
            onChange={(e) => update("href", e.target.value)}
            className={adminInputClass}
            placeholder="https://…"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={adminLabelClass}>Video URL</label>
          <input
            type="url"
            value={value.videoUrl}
            onChange={(e) => update("videoUrl", e.target.value)}
            className={adminInputClass}
            placeholder="YouTube link or direct MP4 URL"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={adminLabelClass}>Poster image URL (optional)</label>
          <input
            type="url"
            value={value.posterImage}
            onChange={(e) => update("posterImage", e.target.value)}
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
            value={value.rating}
            onChange={(e) => update("rating", e.target.value)}
            className={adminInputClass}
          />
        </div>

        <div>
          <label className={adminLabelClass}>Review count</label>
          <input
            type="number"
            min={0}
            value={value.reviewCount}
            onChange={(e) => update("reviewCount", e.target.value)}
            className={adminInputClass}
          />
        </div>

        <div>
          <label className={adminLabelClass}>Discount %</label>
          <input
            type="number"
            min={0}
            max={100}
            value={value.discountPercent}
            onChange={(e) => update("discountPercent", e.target.value)}
            className={adminInputClass}
          />
        </div>

        <div>
          <label className={adminLabelClass}>Deal label</label>
          <input
            type="text"
            value={value.dealLabel}
            onChange={(e) => update("dealLabel", e.target.value)}
            className={adminInputClass}
            placeholder="Limited time deal"
          />
        </div>

        <div>
          <label className={adminLabelClass}>Ad price (GHS)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={value.priceGhs}
            onChange={(e) => update("priceGhs", e.target.value)}
            className={adminInputClass}
          />
        </div>

        <div>
          <label className={adminLabelClass}>Original price (GHS)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={value.originalPriceGhs}
            onChange={(e) => update("originalPriceGhs", e.target.value)}
            className={adminInputClass}
          />
        </div>
      </div>
    </div>
  );
}
