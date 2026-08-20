"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GENTS_SCENTS_CHANNEL,
  type GentsScentsVideoReview,
} from "@/lib/gents-scents-shared";

function thumbUrl(youtubeId: string) {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

function ChannelMark() {
  return (
    <span className="w-7 h-7 rounded-full bg-[#1c1917] text-[#c5a35a] text-[10px] font-semibold tracking-wide flex items-center justify-center shrink-0">
      GS
    </span>
  );
}

function VideoReviewCard({
  review,
  onPlay,
}: {
  review: GentsScentsVideoReview;
  onPlay: (review: GentsScentsVideoReview) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <article className="rounded-2xl bg-[#f3f5f9] p-3 sm:p-4 shadow-[0_8px_24px_rgba(28,25,23,0.06)]">
      <div className="flex items-center gap-2 mb-3">
        <ChannelMark />
        <p className="text-sm leading-none">
          <a
            href={review.channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#3b82f6] font-medium hover:underline"
          >
            {review.username}
          </a>
          {review.timeAgo ? (
            <span className="text-[#9aa0ab] ml-1.5">{review.timeAgo}</span>
          ) : null}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onPlay(review)}
        className="relative block w-full aspect-[16/10] rounded-xl overflow-hidden bg-black/10 group"
        aria-label={`Play ${review.title}`}
      >
        <Image
          src={thumbUrl(review.youtubeId)}
          alt={review.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <span className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition-colors" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-11 h-11 rounded-full bg-white/95 flex items-center justify-center shadow-md">
            <Play className="w-4 h-4 text-espresso fill-espresso ml-0.5" />
          </span>
        </span>
      </button>

      <h3 className="mt-3 text-[13px] sm:text-sm font-semibold text-[#1a1a1a] leading-snug line-clamp-3">
        {review.title}
      </h3>

      {review.perfumes.length > 0 ? (
        <div ref={menuRef} className="relative mt-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full bg-[#e4e7ee] px-3 py-1 text-[12px] text-[#5b6270]"
            aria-expanded={open}
          >
            {review.perfumes.length} Perfume{review.perfumes.length === 1 ? "" : "s"}
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
          </button>
          {open && (
            <div className="absolute left-0 top-full mt-1.5 z-20 min-w-[180px] rounded-lg border border-wf-border bg-white py-1 shadow-lg">
              {review.perfumes.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  className="block px-3 py-1.5 text-sm text-espresso hover:bg-ivory"
                >
                  {p.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}

export function VideoReviews({ reviews }: { reviews: GentsScentsVideoReview[] }) {
  const [active, setActive] = useState<GentsScentsVideoReview | null>(null);

  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActive(null);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  if (!reviews.length) return null;

  return (
    <section className="py-16 px-4 bg-ivory border-t border-wf-border">
      <div className="max-w-[1500px] mx-auto">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-mocha mb-2">
              From YouTube
            </p>
            <h2 className="font-playfair text-3xl text-espresso">Video Reviews</h2>
            <p className="mt-1 text-sm text-wf-gray">
              Latest reviews from{" "}
              <a
                href={GENTS_SCENTS_CHANNEL.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-espresso underline underline-offset-2 hover:text-highlight"
              >
                {GENTS_SCENTS_CHANNEL.handle}
              </a>
            </p>
          </div>
          <a
            href={GENTS_SCENTS_CHANNEL.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex text-sm text-mocha hover:text-espresso"
          >
            Watch on YouTube
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-3 md:gap-x-4 gap-y-6">
          {reviews.map((review) => (
            <VideoReviewCard key={review.id} review={review} onPlay={setActive} />
          ))}
        </div>
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="relative w-full max-w-3xl aspect-video bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActive(null)}
              className="absolute -top-10 right-0 text-white/90 hover:text-white"
              aria-label="Close video"
            >
              <X className="w-6 h-6" />
            </button>
            <iframe
              title={active.title}
              src={`https://www.youtube.com/embed/${active.youtubeId}?autoplay=1&rel=0`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </section>
  );
}
