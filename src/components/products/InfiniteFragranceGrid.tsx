"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/products/ProductCard";
import type { FragranceWithRelations } from "@/lib/fragrances-shared";
import { FRAGRANCE_PAGE_SIZE } from "@/lib/fragrances-shared";

interface InfiniteFragranceGridProps {
  initialFragrances: FragranceWithRelations[];
  total: number;
  pageSize?: number;
  brandSlug?: string;
  emptyMessage?: string;
}

export function InfiniteFragranceGrid({
  initialFragrances,
  total,
  pageSize = FRAGRANCE_PAGE_SIZE,
  brandSlug,
  emptyMessage = "No fragrances found matching your criteria.",
}: InfiniteFragranceGridProps) {
  const searchParams = useSearchParams();
  const filterKey = searchParams.toString();
  const [fragrances, setFragrances] = useState(initialFragrances);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialFragrances.length < total);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFragrances(initialFragrances);
    setPage(1);
    setHasMore(initialFragrances.length < total);
  }, [filterKey, initialFragrances, total]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const nextPage = page + 1;
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(nextPage));
      params.set("limit", String(pageSize));
      if (brandSlug) params.set("brandSlug", brandSlug);

      const response = await fetch(`/api/fragrances?${params.toString()}`);
      if (!response.ok) return;

      const data = await response.json();
      setFragrances((current) => {
        const merged = [...current, ...data.fragrances];
        setHasMore(merged.length < data.total);
        return merged;
      });
      setPage(nextPage);
    } finally {
      setLoading(false);
    }
  }, [brandSlug, hasMore, loading, page, pageSize, searchParams]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (fragrances.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-wf-gray text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-3 md:gap-x-4 gap-y-10">
        {fragrances.map((fragrance) => (
          <ProductCard key={fragrance.id} fragrance={fragrance} />
        ))}
      </div>

      <div ref={sentinelRef} className="h-10 mt-8 flex items-center justify-center">
        {loading && <div className="skeleton w-40 h-4 rounded" />}
        {!loading && !hasMore && fragrances.length > pageSize && (
          <p className="text-sm text-wf-gray">You&apos;ve seen all {total} fragrances</p>
        )}
      </div>
    </>
  );
}
