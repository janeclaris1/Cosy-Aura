"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { X } from "lucide-react";
import {
  BOTTLE_SIZE_OPTIONS,
  COLLECTION_OPTIONS,
  CONCENTRATION_OPTIONS,
  FILTER_CHIP_LABELS,
  FRAGRANCE_FAMILY_OPTIONS,
  GENDER_OPTIONS,
  LONGEVITY_OPTIONS,
  PRICE_RANGE_OPTIONS,
  priceRangeLabel,
  SILLAGE_OPTIONS,
  SUSTAINABILITY_OPTIONS,
} from "@/lib/filter-options";
import { useLocaleStore, useT } from "@/lib/locale-store";
import { formatPrice } from "@/lib/utils";

interface FilterSidebarProps {
  brandSlug?: string;
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function FilterSidebar({ brandSlug }: FilterSidebarProps) {
  const t = useT();
  const currency = useLocaleStore((s) => s.currency);
  useLocaleStore((s) => s.rates);
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      const base = brandSlug ? `/fragrances/${brandSlug}` : "/fragrances";
      router.push(`${base}?${params.toString()}`);
    },
    [router, searchParams, brandSlug]
  );

  const toggleArrayFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.get(key)?.split(",").filter(Boolean) || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      if (updated.length) params.set(key, updated.join(","));
      else params.delete(key);
      params.delete("page");
      const base = brandSlug ? `/fragrances/${brandSlug}` : "/fragrances";
      router.push(`${base}?${params.toString()}`);
    },
    [router, searchParams, brandSlug]
  );

  const setPriceRange = useCallback(
    (min: string | null, max: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (min) params.set("minPrice", min);
      else params.delete("minPrice");
      if (max) params.set("maxPrice", max);
      else params.delete("maxPrice");
      params.delete("page");
      const base = brandSlug ? `/fragrances/${brandSlug}` : "/fragrances";
      router.push(`${base}?${params.toString()}`);
    },
    [router, searchParams, brandSlug]
  );

  const active = (key: string) => searchParams.get(key)?.split(",").filter(Boolean) || [];

  const checkboxClass =
    "rounded border-wf-border text-highlight focus:ring-highlight accent-highlight";

  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-8">
      <FilterGroup title={t("pdp.family")}>
        {FRAGRANCE_FAMILY_OPTIONS.map((m) => (
          <label key={m.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={active("fragranceFamily").includes(m.value)}
              onChange={() => toggleArrayFilter("fragranceFamily", m.value)}
              className={checkboxClass}
            />
            <span className="text-sm">{m.label}</span>
          </label>
        ))}
      </FilterGroup>

      <FilterGroup title={t("pdp.concentration")}>
        {CONCENTRATION_OPTIONS.map((m) => (
          <label key={m.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={active("concentration").includes(m.value)}
              onChange={() => toggleArrayFilter("concentration", m.value)}
              className={checkboxClass}
            />
            <span className="text-sm">{m.label}</span>
          </label>
        ))}
      </FilterGroup>

      <FilterGroup title={t("plp.longevity")}>
        {LONGEVITY_OPTIONS.map((m) => (
          <label key={m.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={active("longevity").includes(m.value)}
              onChange={() => toggleArrayFilter("longevity", m.value)}
              className={checkboxClass}
            />
            <span className="text-sm">{m.label}</span>
          </label>
        ))}
      </FilterGroup>

      <FilterGroup title={t("plp.bottleSize")}>
        {BOTTLE_SIZE_OPTIONS.map((m) => (
          <label key={m.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={active("bottleSize").includes(m.value)}
              onChange={() => toggleArrayFilter("bottleSize", m.value)}
              className={checkboxClass}
            />
            <span className="text-sm">{m.label}</span>
          </label>
        ))}
      </FilterGroup>

      <FilterGroup title={t("plp.sillage")}>
        {SILLAGE_OPTIONS.map((m) => (
          <label key={m.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={active("sillage").includes(m.value)}
              onChange={() => toggleArrayFilter("sillage", m.value)}
              className={checkboxClass}
            />
            <span className="text-sm">{m.label}</span>
          </label>
        ))}
      </FilterGroup>

      <FilterGroup title={t("plp.gender")}>
        {GENDER_OPTIONS.map((m) => (
          <label key={m.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={active("gender").includes(m.value)}
              onChange={() => toggleArrayFilter("gender", m.value)}
              className={checkboxClass}
            />
            <span className="text-sm">{m.label}</span>
          </label>
        ))}
      </FilterGroup>

      <FilterGroup title={t("plp.collection")}>
        {COLLECTION_OPTIONS.map((m) => (
          <label key={m.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={active("collection").includes(m.value)}
              onChange={() => toggleArrayFilter("collection", m.value)}
              className={checkboxClass}
            />
            <span className="text-sm">{m.label}</span>
          </label>
        ))}
      </FilterGroup>

      <FilterGroup title={t("plp.sustainability")}>
        {SUSTAINABILITY_OPTIONS.map((m) => (
          <label key={m.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={active("sustainability").includes(m.value)}
              onChange={() => toggleArrayFilter("sustainability", m.value)}
              className={checkboxClass}
            />
            <span className="text-sm">{m.label}</span>
          </label>
        ))}
      </FilterGroup>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">{t("nav.price")}</h3>
        <div className="space-y-2 mb-3">
          {PRICE_RANGE_OPTIONS.map((preset) => {
            const isActive =
              (searchParams.get("minPrice") || "") === (preset.min || "") &&
              (searchParams.get("maxPrice") || "") === (preset.max || "");
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setPriceRange(preset.min, preset.max)}
                className={`block w-full text-left text-sm px-3 py-2 rounded border transition-colors duration-organic ease-organic ${
                  isActive
                    ? "border-highlight bg-highlight-light/30 text-espresso"
                    : "border-wf-border hover:border-highlight"
                }`}
              >
                {priceRangeLabel(preset, currency, t, formatPrice)}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            defaultValue={searchParams.get("minPrice") || ""}
            onBlur={(e) => updateFilter("minPrice", e.target.value || null)}
            className="w-full px-3 py-2 border border-wf-border rounded text-sm focus:outline-none focus:border-highlight"
          />
          <input
            type="number"
            placeholder="Max"
            defaultValue={searchParams.get("maxPrice") || ""}
            onBlur={(e) => updateFilter("maxPrice", e.target.value || null)}
            className="w-full px-3 py-2 border border-wf-border rounded text-sm focus:outline-none focus:border-highlight"
          />
        </div>
      </div>
    </aside>
  );
}

export function ActiveFilters({ brandSlug }: { brandSlug?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters: { key: string; label: string; value: string }[] = [];

  searchParams.forEach((value, key) => {
    if (key === "sort" || key === "page" || key === "view" || key === "limit") return;
    filters.push({
      key,
      label: FILTER_CHIP_LABELS[key] || key,
      value,
    });
  });

  if (filters.length === 0) return null;

  function removeFilter(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    if (key === "minPrice") params.delete("maxPrice");
    if (key === "maxPrice") params.delete("minPrice");
    params.delete("page");
    const base = brandSlug ? `/fragrances/${brandSlug}` : "/fragrances";
    const qs = params.toString();
    router.push(qs ? `${base}?${qs}` : base);
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => removeFilter(f.key)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ivory border border-wf-border rounded-full text-xs hover:border-highlight transition-colors duration-organic ease-organic"
        >
          {f.label}: {f.value.replace(/,/g, ", ")}
          <X className="w-3 h-3" />
        </button>
      ))}
    </div>
  );
}
