"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Leaf, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/locale-store";
import {
  BOTTLE_SIZE_OPTIONS,
  COLLECTION_OPTIONS,
  CONCENTRATION_OPTIONS,
  FRAGRANCE_FAMILY_OPTIONS,
  GENDER_OPTIONS,
  LONGEVITY_OPTIONS,
  PRICE_RANGE_OPTIONS,
  SILLAGE_OPTIONS,
  SUSTAINABILITY_OPTIONS,
} from "@/lib/filter-options";

type BrandOption = { id: string; name: string; slug: string };
type SeriesOption = {
  id: string;
  name: string;
  slug: string;
  brand: { slug: string; name: string };
};

interface ProductToolbarProps {
  total: number;
  brandSlug?: string;
  brands?: BrandOption[];
  series?: SeriesOption[];
  bottleSizes?: number[];
}

const MORE_FILTER_KEYS = [
  "fragranceFamily",
  "concentration",
  "longevity",
  "bottleSize",
  "sillage",
  "gender",
  "collection",
  "sustainability",
  "isVegan",
  "isCrueltyFree",
  "sampleAvailable",
] as const;

export function ProductToolbar({
  total,
  brandSlug,
  brands = [],
  bottleSizes = [],
}: ProductToolbarProps) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort") || "newest";
  const [open, setOpen] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const base = brandSlug ? `/fragrances/${brandSlug}` : "/fragrances";

  const pushParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      params.delete("page");
      const qs = params.toString();
      router.push(qs ? `${base}?${qs}` : base);
    },
    [base, router, searchParams]
  );

  const setParam = useCallback(
    (key: string, value: string | null) => {
      pushParams((params) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      setOpen(null);
    },
    [pushParams]
  );

  const setRange = useCallback(
    (minKey: string, maxKey: string, min: string | null, max: string | null) => {
      pushParams((params) => {
        if (min) params.set(minKey, min);
        else params.delete(minKey);
        if (max) params.set(maxKey, max);
        else params.delete(maxKey);
      });
      setOpen(null);
    },
    [pushParams]
  );

  const toggleArray = useCallback(
    (key: string, value: string) => {
      pushParams((params) => {
        const current = params.get(key)?.split(",").filter(Boolean) || [];
        const updated = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        if (updated.length) params.set(key, updated.join(","));
        else params.delete(key);
      });
    },
    [pushParams]
  );

  const activeValues = (key: string) =>
    searchParams.get(key)?.split(",").filter(Boolean) || [];

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!barRef.current?.contains(e.target as Node)) {
        setOpen(null);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = moreOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  const activeBrand = brandSlug || searchParams.get("brand") || "";
  const activeBottleSizes = activeValues("bottleSize");
  const hasPrice = Boolean(searchParams.get("minPrice") || searchParams.get("maxPrice"));
  const moreCount = MORE_FILTER_KEYS.filter((key) => searchParams.get(key)).length;

  const sizeOptions =
    bottleSizes.length > 0
      ? bottleSizes.map((size) => ({ value: String(size), label: `${size} ml` }))
      : [...BOTTLE_SIZE_OPTIONS];

  function selectBrand(slug: string | null) {
    setOpen(null);
    if (!slug) {
      router.push("/fragrances");
      return;
    }
    router.push(`/fragrances/${slug}`);
  }

  const pills: {
    id: string;
    label: string;
    active: boolean;
    hidden?: boolean;
  }[] = [
    { id: "brands", label: "Brands", active: Boolean(activeBrand), hidden: Boolean(brandSlug) },
    { id: "bottleSize", label: "Bottle Size", active: activeBottleSizes.length > 0 },
    { id: "price", label: "Price", active: hasPrice },
    {
      id: "fragranceFamily",
      label: t("pdp.family"),
      active: activeValues("fragranceFamily").length > 0,
    },
    {
      id: "concentration",
      label: t("pdp.concentration"),
      active: activeValues("concentration").length > 0,
    },
    { id: "gender", label: "Gender", active: activeValues("gender").length > 0 },
  ];

  return (
    <div className="mb-6" ref={barRef}>
      <div className="flex items-center justify-between gap-4 mb-4">
        <p className="text-sm text-wf-gray">{t("plp.results", { n: total })}</p>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{t("plp.sort")}</span>
          <select
            value={sort}
            onChange={(e) => setParam("sort", e.target.value)}
            className="text-sm border-0 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="newest">{t("plp.sortNewest")}</option>
            <option value="price-asc">{t("plp.sortPriceAsc")}</option>
            <option value="price-desc">{t("plp.sortPriceDesc")}</option>
            <option value="reference">{t("plp.sortName")}</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
        {pills
          .filter((pill) => !pill.hidden)
          .map((pill) => (
            <div key={pill.id} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setOpen(open === pill.id ? null : pill.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full text-sm px-3.5 sm:px-4 py-2 transition-colors whitespace-nowrap",
                  pill.active || open === pill.id
                    ? "bg-wf-black text-white"
                    : "bg-[#f1f1f1] hover:bg-[#e8e8e8] text-wf-black"
                )}
              >
                {pill.label}
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform",
                    open === pill.id && "rotate-180"
                  )}
                />
              </button>

              {open === pill.id && (
                <div className="absolute left-0 top-full mt-2 z-40 w-[min(90vw,280px)] max-h-[60vh] overflow-y-auto rounded-xl border border-wf-border bg-white shadow-lg p-2">
                  {pill.id === "brands" && (
                    <div className="flex flex-wrap items-center gap-1">
                      <DropdownItem
                        label="All brands"
                        active={!activeBrand}
                        onClick={() => selectBrand(null)}
                        horizontal
                      />
                      {brands.map((brand) => (
                        <DropdownItem
                          key={brand.id}
                          label={brand.name}
                          active={activeBrand === brand.slug}
                          onClick={() => selectBrand(brand.slug)}
                          horizontal
                        />
                      ))}
                    </div>
                  )}

                  {pill.id === "bottleSize" && (
                    <>
                      <DropdownItem
                        label="All sizes"
                        active={activeBottleSizes.length === 0}
                        onClick={() => setParam("bottleSize", null)}
                      />
                      {sizeOptions.length === 0 && (
                        <p className="px-3 py-2 text-sm text-wf-gray">No sizes available</p>
                      )}
                      {sizeOptions.map((size) => (
                        <DropdownItem
                          key={size.value}
                          label={size.label}
                          active={activeBottleSizes.includes(size.value)}
                          onClick={() => toggleArray("bottleSize", size.value)}
                        />
                      ))}
                    </>
                  )}

                  {pill.id === "price" && (
                    <>
                      <DropdownItem
                        label="Any price"
                        active={!hasPrice}
                        onClick={() => setRange("minPrice", "maxPrice", null, null)}
                      />
                      {PRICE_RANGE_OPTIONS.map((preset) => (
                        <DropdownItem
                          key={preset.label}
                          label={preset.label}
                          active={
                            (searchParams.get("minPrice") || "") === (preset.min || "") &&
                            (searchParams.get("maxPrice") || "") === (preset.max || "")
                          }
                          onClick={() =>
                            setRange("minPrice", "maxPrice", preset.min, preset.max)
                          }
                        />
                      ))}
                      <div className="border-t border-wf-border mt-2 pt-2 px-2 space-y-2">
                        <p className="text-xs text-wf-gray px-1">Custom range</p>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Min"
                            defaultValue={searchParams.get("minPrice") || ""}
                            className="w-full px-2 py-1.5 border border-wf-border rounded text-sm"
                            id="filter-min-price"
                          />
                          <input
                            type="number"
                            placeholder="Max"
                            defaultValue={searchParams.get("maxPrice") || ""}
                            className="w-full px-2 py-1.5 border border-wf-border rounded text-sm"
                            id="filter-max-price"
                          />
                        </div>
                        <button
                          type="button"
                          className="w-full btn-gold text-sm py-2"
                          onClick={() => {
                            const min = (
                              document.getElementById("filter-min-price") as HTMLInputElement
                            )?.value;
                            const max = (
                              document.getElementById("filter-max-price") as HTMLInputElement
                            )?.value;
                            setRange(
                              "minPrice",
                              "maxPrice",
                              min || null,
                              max || null
                            );
                          }}
                        >
                          {t("plp.apply")}
                        </button>
                      </div>
                    </>
                  )}

                  {pill.id === "fragranceFamily" && (
                    <>
                      <DropdownItem
                        label="All families"
                        active={activeValues("fragranceFamily").length === 0}
                        onClick={() => setParam("fragranceFamily", null)}
                      />
                      {FRAGRANCE_FAMILY_OPTIONS.map((item) => (
                        <DropdownItem
                          key={item.value}
                          label={item.label}
                          active={activeValues("fragranceFamily").includes(item.value)}
                          onClick={() => toggleArray("fragranceFamily", item.value)}
                        />
                      ))}
                    </>
                  )}

                  {pill.id === "concentration" && (
                    <>
                      <DropdownItem
                        label="All concentrations"
                        active={activeValues("concentration").length === 0}
                        onClick={() => setParam("concentration", null)}
                      />
                      {CONCENTRATION_OPTIONS.map((item) => (
                        <DropdownItem
                          key={item.value}
                          label={item.label}
                          active={activeValues("concentration").includes(item.value)}
                          onClick={() => toggleArray("concentration", item.value)}
                        />
                      ))}
                    </>
                  )}

                  {pill.id === "gender" && (
                    <>
                      <DropdownItem
                        label="All genders"
                        active={activeValues("gender").length === 0}
                        onClick={() => setParam("gender", null)}
                      />
                      {GENDER_OPTIONS.map((item) => (
                        <DropdownItem
                          key={item.value}
                          label={item.label}
                          active={activeValues("gender").includes(item.value)}
                          onClick={() => toggleArray("gender", item.value)}
                        />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}

        <button
          type="button"
          onClick={() => {
            setOpen(null);
            setMoreOpen(true);
          }}
          className={cn(
            "shrink-0 inline-flex items-center gap-2 rounded-full text-sm px-3.5 sm:px-4 py-2 transition-colors whitespace-nowrap",
            moreCount > 0
              ? "bg-wf-black text-white"
              : "bg-[#f1f1f1] hover:bg-[#e8e8e8] text-wf-black"
          )}
        >
          <span>
            {t("plp.moreFilters")}
            {moreCount > 0 ? ` (${moreCount})` : ""}
          </span>
          <Leaf className="w-3.5 h-3.5" />
        </button>
      </div>

      {moreOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t("common.close")}
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-none shadow-xl max-h-[85vh] sm:max-h-none overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-wf-border px-4 py-4 flex items-center justify-between">
              <h2 className="font-playfair text-xl">{t("plp.moreFilters")}</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-1 hover:text-gold"
                aria-label={t("common.close")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              <MoreFilterGroup title={t("plp.longevity")}>
                {LONGEVITY_OPTIONS.map((item) => (
                  <label key={item.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={activeValues("longevity").includes(item.value)}
                      onChange={() => toggleArray("longevity", item.value)}
                    />
                    {item.label}
                  </label>
                ))}
              </MoreFilterGroup>

              <MoreFilterGroup title={t("plp.sillage")}>
                {SILLAGE_OPTIONS.map((item) => (
                  <label key={item.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={activeValues("sillage").includes(item.value)}
                      onChange={() => toggleArray("sillage", item.value)}
                    />
                    {item.label}
                  </label>
                ))}
              </MoreFilterGroup>

              <MoreFilterGroup title={t("plp.collection")}>
                {COLLECTION_OPTIONS.map((item) => (
                  <label key={item.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={activeValues("collection").includes(item.value)}
                      onChange={() => toggleArray("collection", item.value)}
                    />
                    {item.label}
                  </label>
                ))}
              </MoreFilterGroup>

              <MoreFilterGroup title={t("plp.sustainability")}>
                {SUSTAINABILITY_OPTIONS.map((item) => (
                  <label key={item.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={activeValues("sustainability").includes(item.value)}
                      onChange={() => toggleArray("sustainability", item.value)}
                    />
                    {item.label}
                  </label>
                ))}
              </MoreFilterGroup>

              <MoreFilterGroup title={t("plp.extras")}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={searchParams.get("sampleAvailable") === "true"}
                    onChange={() =>
                      setParam(
                        "sampleAvailable",
                        searchParams.get("sampleAvailable") === "true" ? null : "true"
                      )
                    }
                  />
                  Sample available
                </label>
              </MoreFilterGroup>

              <MoreFilterGroup title={t("pdp.concentration")}>
                {CONCENTRATION_OPTIONS.map((item) => (
                  <label key={item.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={activeValues("concentration").includes(item.value)}
                      onChange={() => toggleArray("concentration", item.value)}
                    />
                    {item.label}
                  </label>
                ))}
              </MoreFilterGroup>

              <MoreFilterGroup title={t("pdp.family")}>
                {FRAGRANCE_FAMILY_OPTIONS.map((item) => (
                  <label key={item.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={activeValues("fragranceFamily").includes(item.value)}
                      onChange={() => toggleArray("fragranceFamily", item.value)}
                    />
                    {item.label}
                  </label>
                ))}
              </MoreFilterGroup>

              <MoreFilterGroup title="Gender">
                {GENDER_OPTIONS.map((item) => (
                  <label key={item.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={activeValues("gender").includes(item.value)}
                      onChange={() => toggleArray("gender", item.value)}
                    />
                    {item.label}
                  </label>
                ))}
              </MoreFilterGroup>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-wf-border p-4 flex gap-3">
              <button
                type="button"
                className="btn-outline flex-1"
                onClick={() => {
                  pushParams((params) => {
                    MORE_FILTER_KEYS.forEach((key) => params.delete(key));
                  });
                }}
              >
                {t("plp.clear")}
              </button>
              <button
                type="button"
                className="btn-gold flex-1"
                onClick={() => setMoreOpen(false)}
              >
                {t("plp.results", { n: total })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  label,
  active,
  onClick,
  horizontal = false,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  horizontal?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-wf-light transition-colors",
        horizontal && "w-auto shrink-0 whitespace-nowrap",
        active && "bg-wf-light text-gold font-medium"
      )}
    >
      {label}
    </button>
  );
}

function MoreFilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
