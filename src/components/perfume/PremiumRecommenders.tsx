"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  OCCASIONS,
  SEASONS,
  GIFT_PERSONAS,
  scoreForOccasion,
  scoreForSeason,
  scoreForGiftPersona,
  type CatalogFragrance,
} from "@/lib/scent-intelligence";
import { formatPrice, cn } from "@/lib/utils";
import { useLocaleStore } from "@/lib/locale-store";
import { ProductCard } from "@/components/products/ProductCard";
import Image from "next/image";

/** Minimal card used by occasion / gift finders. */
function ResultGrid({ items }: { items: CatalogFragrance[] }) {
  const currency = useLocaleStore((s) => s.currency);
  useLocaleStore((s) => s.rates);
  if (!items.length) {
    return (
      <p className="text-sm text-wf-gray py-8">
        No strong matches yet - try another option or browse the full catalog.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
      {items.map((f) => (
        <Link key={f.id} href={`/fragrances/${f.slug}`} className="group">
          <div className="relative aspect-square bg-wf-light mb-2 overflow-hidden rounded-lg">
            <Image
              src={f.images[0]?.url || "/images/placeholders/fragrance.svg"}
              alt={f.model}
              fill
              className="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="(max-width:768px) 50vw, 25vw"
            />
          </div>
          <p className="text-xs text-wf-gray">{f.brand.name}</p>
          <p className="text-sm font-semibold">{f.model}</p>
          <p className="text-sm text-gold">{formatPrice(f.price, currency)}</p>
        </Link>
      ))}
    </div>
  );
}

export type RecommendCatalogFragrance = CatalogFragrance & {
  stock?: number;
  brand: { name: string; slug?: string };
  countryStocks?: { country: string; inStock: boolean }[];
  viewCount?: number;
  likeCount?: number;
};

/** @deprecated Use RecommendCatalogFragrance */
export type SeasonalCatalogFragrance = RecommendCatalogFragrance;

function RecommendProductGrid({
  items,
  emptyHint = "try another option",
}: {
  items: RecommendCatalogFragrance[];
  emptyHint?: string;
}) {
  if (!items.length) {
    return (
      <p className="text-sm text-wf-gray py-8">
        No strong matches yet - {emptyHint} or{" "}
        <Link href="/fragrances" className="text-gold hover:underline">
          browse the full catalog
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8 md:gap-x-6">
      {items.map((f) => (
        <ProductCard key={f.id} fragrance={f} animate={false} />
      ))}
    </div>
  );
}

export function OccasionRecs({ catalog }: { catalog: CatalogFragrance[] }) {
  const [id, setId] = useState<string>(OCCASIONS[0].id);
  const results = useMemo(() => {
    return [...catalog]
      .map((f) => ({ f, score: scoreForOccasion(f, id) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.f);
  }, [catalog, id]);
  const active = OCCASIONS.find((o) => o.id === id)!;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {OCCASIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setId(o.id)}
            className={cn(
              "px-3 py-2 text-sm border transition-colors",
              id === o.id ? "border-gold bg-highlight/20" : "border-wf-border hover:border-gold"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-wf-gray mb-6">{active.blurb}</p>
      <ResultGrid items={results} />
    </div>
  );
}

export function SeasonalGuide({
  catalog,
}: {
  catalog: RecommendCatalogFragrance[];
}) {
  const [id, setId] = useState<string>(SEASONS[0].id);
  const season = SEASONS.find((s) => s.id === id)!;
  const results = useMemo(() => {
    return [...catalog]
      .map((f) => ({ f, score: scoreForSeason(f, id) }))
      .filter((x) => x.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score || a.f.brand.name.localeCompare(b.f.brand.name)
      )
      .map((x) => x.f);
  }, [catalog, id]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {SEASONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setId(s.id)}
            className={cn(
              "px-3 py-2 text-sm border transition-colors",
              id === s.id
                ? "border-gold bg-highlight/20"
                : "border-wf-border hover:border-gold"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-wf-gray mb-3">{season.blurb}</p>
      <ul className="text-sm text-mocha mb-4 space-y-1 list-disc pl-5">
        {season.tips.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <p className="text-xs uppercase tracking-[0.14em] text-wf-gray mb-6">
        {results.length} {results.length === 1 ? "fragrance" : "fragrances"} ·
        prices include store deals
      </p>
      <RecommendProductGrid items={results} emptyHint="try another season" />
    </div>
  );
}

export function GiftFinder({
  catalog,
}: {
  catalog: RecommendCatalogFragrance[];
}) {
  const [id, setId] = useState<string>(GIFT_PERSONAS[0].id);
  const persona = GIFT_PERSONAS.find((p) => p.id === id)!;
  const results = useMemo(() => {
    return [...catalog]
      .map((f) => ({ f, score: scoreForGiftPersona(f, id) }))
      .filter((x) => x.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score || a.f.brand.name.localeCompare(b.f.brand.name)
      )
      .map((x) => x.f);
  }, [catalog, id]);

  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {GIFT_PERSONAS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setId(p.id)}
            className={cn(
              "text-left p-4 border transition-colors",
              id === p.id
                ? "border-gold bg-highlight/15"
                : "border-wf-border hover:border-gold"
            )}
          >
            <p className="font-playfair text-lg mb-1">{p.label}</p>
            <p className="text-sm text-wf-gray">{p.blurb}</p>
          </button>
        ))}
      </div>
      <p className="text-sm text-wf-gray mb-3">
        Gifts for{" "}
        <span className="text-espresso font-medium">{persona.label}</span>
        {" — "}
        {persona.blurb}
      </p>
      <p className="text-xs uppercase tracking-[0.14em] text-wf-gray mb-6">
        {results.length} {results.length === 1 ? "fragrance" : "fragrances"} ·
        prices include store deals
      </p>
      <RecommendProductGrid
        items={results}
        emptyHint="try another personality"
      />
    </div>
  );
}
