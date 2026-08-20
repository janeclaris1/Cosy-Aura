"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Flower2 } from "lucide-react";
import { cn, formatPrice, inspiredByBrandLine } from "@/lib/utils";
import { useRegionalPrice } from "@/lib/use-regional-price";
import { salePriceForSize } from "@/lib/pricing";
import { useLocaleStore, useT } from "@/lib/locale-store";

interface SearchResult {
  slug: string;
  brand: string;
  model: string;
  reference: string;
  price: number;
  image: string;
}

function SearchResultPrice({ slug, currency }: { slug: string; currency: string }) {
  const regionalPrice = useRegionalPrice(salePriceForSize(30, slug));
  return <>{formatPrice(regionalPrice, currency)}</>;
}

export function SearchBar() {
  const currency = useLocaleStore((s) => s.currency);
  useLocaleStore((s) => s.rates);
  const t = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.hits || []);
        setOpen(true);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div ref={ref} className="relative w-full">
      <div className="relative">
        <Flower2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
        <input
          type="text"
          placeholder={t("search.placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-wf-border rounded-full text-sm focus:outline-none focus:border-highlight transition-colors duration-organic ease-organic"
        />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-wf-border shadow-xl rounded-lg z-50 max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-4 text-sm text-wf-gray text-center">{t("search.searching")}</div>
          )}
          {!loading && results.length === 0 && query.length >= 2 && (
            <div className="p-4 text-sm text-wf-gray text-center">{t("search.empty")}</div>
          )}
          {results.map((hit) => (
            <Link
              key={hit.slug}
              href={`/fragrances/${hit.slug}`}
              onClick={() => {
                setOpen(false);
                setQuery("");
              }}
              className="flex items-center gap-3 p-3 hover:bg-wf-light transition-colors"
            >
              <div className="relative w-12 h-12 rounded overflow-hidden shrink-0 bg-accent">
                <Image
                  src={hit.image || "/images/placeholders/fragrance.svg"}
                  alt={hit.model}
                  fill
                  className="object-contain"
                  sizes="48px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider font-semibold text-wf-black">
                  {hit.brand}
                </p>
                <p className="text-sm text-wf-gray truncate">{hit.model}</p>
                <p className="text-[11px] text-wf-black truncate">
                  {inspiredByBrandLine(hit.brand, hit.model)}
                </p>
              </div>
              <p className="font-playfair text-gold text-sm shrink-0">
                <SearchResultPrice slug={hit.slug} currency={currency} />
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
