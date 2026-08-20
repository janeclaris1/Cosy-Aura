"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, FlaskConical } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { useLocaleStore } from "@/lib/locale-store";
import { formatPrice, cn } from "@/lib/utils";
import Image from "next/image";
import { SAMPLE_SIZE_ML, sampleSalePrice } from "@/lib/pricing";
import {
  DISCOVERY_BUNDLE_DISCOUNT,
  DISCOVERY_BUNDLE_MIN_SAMPLES,
} from "@/lib/discovery-bundle";

export type SampleOption = {
  id: string;
  slug: string;
  model: string;
  brand: { name: string };
  price: number;
  images: { url: string; alt: string | null }[];
  sampleAvailable?: boolean;
};

const SAMPLE_PRICE = sampleSalePrice();
const MIN = 3;
const MAX = 5;
const BUNDLE_DISCOUNT = DISCOVERY_BUNDLE_DISCOUNT;

type Preset = {
  id: string;
  name: string;
  description: string;
  pick: (options: SampleOption[]) => string[];
};

const PRESETS: Preset[] = [
  {
    id: "evening",
    name: "Evening Edit",
    description: "Oriental & woody samples for night wear",
    pick: (opts) => opts.slice(0, 4).map((o) => o.id),
  },
  {
    id: "fresh-start",
    name: "Fresh Start",
    description: "Bright openers for day and travel",
    pick: (opts) => opts.slice(0, 3).map((o) => o.id),
  },
  {
    id: "signature-five",
    name: "Signature Five",
    description: "Full discovery set - five contrasting trails",
    pick: (opts) => opts.slice(0, 5).map((o) => o.id),
  },
];

interface DiscoverySetBuilderProps {
  options: SampleOption[];
  className?: string;
}

export function DiscoverySetBuilder({
  options,
  className,
}: DiscoverySetBuilderProps) {
  const addItem = useCartStore((s) => s.addItem);
  const pool = options
    .filter((o, i, arr) => arr.findIndex((x) => x.id === o.id) === i)
    .filter((o) => o.sampleAvailable !== false)
    .slice(0, 12);
  const [selected, setSelected] = useState<string[]>(() =>
    pool.slice(0, MIN).map((o) => o.id)
  );
  const currency = useLocaleStore((s) => s.currency);
  useLocaleStore((s) => s.rates);
  const [expanded, setExpanded] = useState(false);
  const preview = pool.slice(0, MIN);
  const extra = pool.slice(MIN);
  const visible = expanded ? pool : preview;

  const selectedItems = useMemo(
    () => pool.filter((o) => selected.includes(o.id)),
    [pool, selected]
  );

  const subtotal = selectedItems.length * SAMPLE_PRICE;
  const discount =
    selectedItems.length >= DISCOVERY_BUNDLE_MIN_SAMPLES
      ? Math.round(subtotal * BUNDLE_DISCOUNT * 100) / 100
      : 0;
  const total = Math.round((subtotal - discount) * 100) / 100;

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= MIN) return prev;
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= MAX) return prev;
      return [...prev, id];
    });
  }

  function applyPreset(preset: Preset) {
    const ids = preset.pick(pool).slice(0, MAX);
    if (ids.length >= MIN) setSelected(ids);
    if (ids.some((id) => extra.some((o) => o.id === id))) setExpanded(true);
  }

  function addAllToCart() {
    selectedItems.forEach((item) => {
      addItem({
        fragranceId: item.id,
        slug: item.slug,
        brand: item.brand.name,
        model: `${item.model} · ${SAMPLE_SIZE_ML}ml sample`,
        price: SAMPLE_PRICE,
        image: item.images[0]?.url || "",
        bottleSize: SAMPLE_SIZE_ML,
      });
    });
  }

  if (pool.length < MIN) return null;

  return (
    <div className={cn("rounded-lg border border-wf-border bg-surface p-5", className)}>
      <div className="flex items-center gap-2 mb-1">
        <FlaskConical className="w-4 h-4 text-primary" />
        <h3 className="font-playfair text-xl">Discovery Set Builder</h3>
      </div>
      <p className="text-sm text-mocha mb-4">
        Pick {MIN}-{MAX} samples ({formatPrice(SAMPLE_PRICE, currency)} each). Bundles of 4+ unlock{" "}
        {Math.round(BUNDLE_DISCOUNT * 100)}% off.
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p)}
            className="text-xs px-3 py-1.5 rounded-full border border-wf-border hover:border-highlight hover:text-highlight transition-colors duration-organic ease-organic"
            title={p.description}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visible.map((item) => {
            const on = selected.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                className={cn(
                  "text-left rounded-lg border p-2 transition-all duration-organic ease-organic",
                  on
                    ? "border-highlight bg-highlight-light/30 ring-1 ring-highlight/40"
                    : "border-wf-border hover:border-secondary"
                )}
              >
                <div className="relative aspect-square rounded-md overflow-hidden bg-accent mb-2">
                  <Image
                    src={item.images[0]?.url || "/images/placeholders/fragrance.svg"}
                    alt={item.model}
                    fill
                    className="object-contain"
                    sizes="120px"
                  />
                  {on && (
                    <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-highlight text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <p className="text-[10px] uppercase tracking-wider text-mocha truncate">
                  {item.brand.name}
                </p>
                <p className="text-xs font-medium text-espresso line-clamp-2 leading-snug">
                  {item.model}
                </p>
              </button>
            );
          })}
        </div>

        {extra.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-sm text-espresso border border-wf-border hover:border-espresso transition-colors"
            aria-expanded={expanded}
          >
            {expanded ? "Show fewer samples" : `Show ${extra.length} more samples`}
            <ChevronDown
              className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")}
            />
          </button>
        )}
      </div>

      <div className="rounded-md bg-ivory border border-wf-border p-4 mb-4 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-mocha">
            {selectedItems.length} samples × {formatPrice(SAMPLE_PRICE, currency)}
          </span>
          <span>{formatPrice(subtotal, currency)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-success">
            <span>Bundle discount</span>
            <span>-{formatPrice(discount, currency)}</span>
          </div>
        )}
        <div className="flex justify-between font-playfair text-xl text-primary pt-2 border-t border-wf-border">
          <span>Total</span>
          <span>{formatPrice(total, currency)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={addAllToCart}
        disabled={selectedItems.length < MIN}
        className="btn-gold w-full disabled:opacity-50"
      >
        Add discovery set to cart
      </button>
    </div>
  );
}
