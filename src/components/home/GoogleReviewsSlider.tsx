"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/locale-store";
import type { GoogleReviewCard } from "@/lib/google-reviews";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09A6.97 6.97 0 0 1 5.48 12c0-.72.12-1.43.36-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={cn(
            i < rating ? "fill-gold text-gold" : "fill-wf-border text-wf-border"
          )}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: GoogleReviewCard }) {
  return (
    <article
      data-review-card
      className="group relative shrink-0 w-[min(88vw,320px)] sm:w-[300px] md:w-[320px] rounded-2xl border border-wf-border/80 bg-white p-5 shadow-[0_8px_30px_rgba(28,25,23,0.06)] transition-all duration-500 ease-organic hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(28,25,23,0.1)] hover:border-highlight/30 flex flex-col min-h-[200px]"
    >
      <Quote
        className="absolute top-5 right-5 w-8 h-8 text-highlight/15 rotate-180"
        aria-hidden
      />

      <div className="flex items-center gap-3 pr-8">
        {review.photoUrl ? (
          <Image
            src={review.photoUrl}
            alt=""
            width={44}
            height={44}
            className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-highlight/20 ring-offset-2 ring-offset-white"
            referrerPolicy="no-referrer"
            unoptimized
          />
        ) : (
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0 ring-2 ring-highlight/20 ring-offset-2 ring-offset-white"
            style={{ backgroundColor: review.color }}
          >
            {review.initial}
          </div>
        )}
        <div className="min-w-0 text-left">
          <p className="font-medium text-espresso text-sm leading-tight truncate">
            {review.name}
          </p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-mocha mt-1">
            {review.when}
          </p>
        </div>
      </div>

      <div className="mt-3 mb-2">
        <Stars rating={review.rating} size={13} />
      </div>

      <p className="text-sm text-espresso/85 leading-relaxed line-clamp-3 flex-1">
        {review.text}
      </p>

      <div className="mt-3 pt-3 border-t border-wf-border/60 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-mocha">
          <GoogleMark className="w-3.5 h-3.5" />
          Google
        </span>
        <span className="text-[10px] font-medium text-highlight opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Verified review
        </span>
      </div>
    </article>
  );
}

export function GoogleReviewsSlider({
  reviews,
  mapsUrl,
  rating,
  total,
}: {
  reviews: GoogleReviewCard[];
  mapsUrl?: string;
  rating?: number;
  total?: number;
}) {
  const t = useT();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const displayRating = rating && rating > 0 ? rating : 5;
  const reviewCount = total && total > 0 ? total : reviews.length;

  function updateArrows() {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }

  function scrollByCard(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-review-card]");
    const amount = (card?.offsetWidth ?? 320) + 20;
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [reviews.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || reviews.length < 2) return;
    const timer = setInterval(() => {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollByCard(1);
      }
    }, 6000);
    return () => clearInterval(timer);
  }, [reviews.length]);

  const title = t("home.reviewsTitle");

  return (
    <section className="relative py-8 md:py-10 px-4 overflow-hidden bg-gradient-to-b from-[#faf7f2] via-white to-white border-t border-wf-border/60">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(166,124,82,0.08), transparent 42%), radial-gradient(circle at 80% 0%, rgba(28,25,23,0.04), transparent 38%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto">
        <div className="text-center mb-6 md:mb-7">
          <p className="text-[11px] uppercase tracking-[0.22em] text-highlight mb-2">
            Loved by our community
          </p>
          <h2 className="font-playfair text-3xl md:text-4xl text-espresso">
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-highlight transition-colors duration-300"
              >
                {title}
              </a>
            ) : (
              title
            )}
          </h2>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-stretch">
          {/* Rating summary */}
          <aside className="shrink-0 lg:w-[240px] rounded-2xl bg-espresso text-white p-6 flex flex-col items-center justify-center text-center shadow-[0_20px_50px_rgba(28,25,23,0.18)]">
            <GoogleMark className="w-8 h-8 mb-3" />
            <p className="font-playfair text-4xl leading-none mb-1.5">
              {displayRating.toFixed(1)}
            </p>
            <Stars rating={Math.round(displayRating)} size={16} />
            <p className="text-sm text-white/75 mt-3">
              {reviewCount.toLocaleString()} reviews
            </p>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 text-[11px] uppercase tracking-[0.18em] text-highlight-light hover:text-white transition-colors"
              >
                View on Google
              </a>
            )}
          </aside>

          {/* Slider */}
          <div className="min-w-0 flex-1 flex items-center gap-3">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              disabled={!canPrev}
              aria-label="Previous reviews"
              className="hidden md:flex shrink-0 w-10 h-10 items-center justify-center rounded-full border border-wf-border bg-white text-mocha hover:text-espresso hover:border-highlight/40 hover:shadow-md disabled:opacity-30 disabled:pointer-events-none transition-all duration-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative min-w-0 flex-1">
              <div
                className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#faf7f2] to-transparent z-10 hidden sm:block"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent z-10 hidden sm:block"
                aria-hidden
              />

              <div
                ref={scrollerRef}
                className="flex gap-5 overflow-x-auto scrollbar-hide scroll-smooth py-1 px-0.5"
              >
                {reviews.map((review, index) => (
                  <ReviewCard key={`${review.name}-${index}`} review={review} />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => scrollByCard(1)}
              disabled={!canNext}
              aria-label="Next reviews"
              className="hidden md:flex shrink-0 w-10 h-10 items-center justify-center rounded-full border border-wf-border bg-white text-mocha hover:text-espresso hover:border-highlight/40 hover:shadow-md disabled:opacity-30 disabled:pointer-events-none transition-all duration-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
