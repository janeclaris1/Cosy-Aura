"use client";

import { useEffect, useState } from "react";
import { Eye, Heart } from "lucide-react";
import { useT } from "@/lib/locale-store";
import {
  formatEngagementCount,
  hasUserLiked,
  recordProductView,
  setUserLiked,
  syncProductLike,
} from "@/lib/product-engagement";
import { cn } from "@/lib/utils";

interface ProductEngagementStatsProps {
  fragranceId: string;
  viewCount?: number;
  likeCount?: number;
  trackView?: boolean;
  className?: string;
  compact?: boolean;
}

export function ProductEngagementStats({
  fragranceId,
  viewCount = 0,
  likeCount = 0,
  trackView = false,
  className,
  compact = false,
}: ProductEngagementStatsProps) {
  const t = useT();
  const [views, setViews] = useState(viewCount);
  const [likes, setLikes] = useState(likeCount);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    setViews(viewCount);
    setLikes(likeCount);
    setLiked(hasUserLiked(fragranceId));
  }, [fragranceId, viewCount, likeCount]);

  useEffect(() => {
    if (!trackView || !fragranceId) return;
    void recordProductView(fragranceId).then((counts) => {
      if (!counts) return;
      setViews(counts.viewCount);
    });
  }, [trackView, fragranceId]);

  function handleLikeToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const wasLiked = liked;
    const nextLiked = !wasLiked;
    setLiked(nextLiked);
    setLikes((count) => (wasLiked ? Math.max(0, count - 1) : count + 1));
    setUserLiked(fragranceId, nextLiked);

    void syncProductLike(fragranceId, wasLiked ? "remove" : "add").then((counts) => {
      if (counts) setLikes(counts.likeCount);
    });
  }

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-3 text-mocha",
        compact ? "text-[10px]" : "text-xs",
        className
      )}
      data-no-nav
    >
      <span className="inline-flex items-center gap-1">
        <Eye className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} aria-hidden />
        {t("product.views", { n: formatEngagementCount(views) })}
      </span>
      <button
        type="button"
        onClick={handleLikeToggle}
        className="inline-flex items-center gap-1 hover:text-espresso transition-colors"
        aria-label={liked ? t("product.likeRemove") : t("product.likeAdd")}
        aria-pressed={liked}
      >
        <Heart
          className={cn(
            compact ? "h-3 w-3" : "h-3.5 w-3.5",
            liked && "fill-highlight text-highlight"
          )}
          aria-hidden
        />
        {t("product.likes", { n: formatEngagementCount(likes) })}
      </button>
    </div>
  );
}
