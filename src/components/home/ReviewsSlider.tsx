"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

const SUMMARY = {
  label: "Excellent",
  average: 4.8,
  count: 1284,
};

const REVIEWS = [
  {
    name: "Anonymous",
    rating: 5,
    text: "Bought Chanel No.5 for my anniversary. Packaging was flawless and the fragrance arrived exactly as described - brand new and sealed.",
    product: "Chanel No.5",
    meta: "New York, US · 1 week ago",
  },
  {
    name: "Anonymous",
    rating: 5,
    text: "Smooth checkout and clear shipping updates. My Dior Sauvage smelled stunning out of the box. Will definitely shop here again.",
    product: "Dior Sauvage",
    meta: "London, UK · 2 weeks ago",
  },
  {
    name: "Anonymous",
    rating: 5,
    text: "Customer support answered all my questions before purchase. Delivery was quick after payment confirmation and the Tom Ford Oud Wood is perfect.",
    product: "Tom Ford Oud Wood",
    meta: "Toronto, CA · 3 weeks ago",
  },
  {
    name: "Anonymous",
    rating: 4,
    text: "Beautiful Creed Aventus. Took a little longer through customs, but tracking was transparent the whole way. Very happy with the final bottle.",
    product: "Creed Aventus",
    meta: "Paris, FR · 1 month ago",
  },
  {
    name: "Anonymous",
    rating: 5,
    text: "Authentic Byredo Gypsy Water, sealed and spotless. COSY AURA made buying a luxury fragrance feel simple and secure.",
    product: "Byredo Gypsy Water",
    meta: "Houston, US · 1 month ago",
  },
  {
    name: "Anonymous",
    rating: 5,
    text: "Ordered Maison Francis Kurkdjian Baccarat Rouge as a gift. Presentation was elegant and it arrived right on time.",
    product: "MFK Baccarat Rouge",
    meta: "Sydney, AU · 5 weeks ago",
  },
  {
    name: "Anonymous",
    rating: 5,
    text: "Great selection of Hermès and Le Labo. Prices were competitive and the return policy gave me confidence to buy online.",
    product: "IWC Portugieser",
    meta: "Berlin, DE · 2 months ago",
  },
  {
    name: "Anonymous",
    rating: 5,
    text: "My Grand Seiko looks even better in person. Communication by email was prompt and professional from order to delivery.",
    product: "Grand Seiko Heritage",
    meta: "Tokyo, JP · 2 months ago",
  },
];

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = rating >= i + 1;
        const half = !filled && rating > i && rating < i + 1;
        return (
          <span key={i} className="relative inline-flex">
            <Star
              style={{ width: size, height: size }}
              className={filled ? "text-gold fill-gold" : "text-gray-300 fill-gray-300"}
            />
            {half && (
              <span className="absolute inset-0 overflow-hidden w-1/2">
                <Star
                  style={{ width: size, height: size }}
                  className="text-gold fill-gold"
                />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function ReviewsSlider() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

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
    const amount = (card?.offsetWidth ?? 300) + 16;
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
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const timer = setInterval(() => {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollByCard(1);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-16 px-4 bg-ivory border-t border-wf-border">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-3 md:gap-4 items-stretch">
          {/* Summary card */}
          <div className="shrink-0 w-[200px] sm:w-[220px] md:w-[240px] rounded-xl bg-wf-black text-white flex flex-col items-center justify-center text-center px-5 py-8">
            <p className="text-xl font-semibold mb-3">{SUMMARY.label}</p>
            <Stars rating={SUMMARY.average} size={18} />
            <p className="text-sm text-white/85 mt-3">
              {SUMMARY.average.toFixed(2)} average
            </p>
            <p className="text-sm text-white/70">{SUMMARY.count.toLocaleString()} reviews</p>
            <div className="mt-6 flex items-center gap-2">
              <BrandLogo variant="dark" size="sm" />
            </div>
          </div>

          {/* Controls + slider */}
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              disabled={!canPrev}
              aria-label="Previous reviews"
              className="hidden sm:flex shrink-0 w-8 h-8 items-center justify-center rounded-full border border-wf-border text-wf-gray hover:text-wf-black hover:border-wf-black disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div
              ref={scrollerRef}
              className="flex-1 overflow-x-auto scrollbar-hide scroll-smooth"
            >
              <div className="flex gap-4 pr-1">
                {REVIEWS.map((review) => (
                  <article
                    key={review.meta}
                    data-review-card
                    className="shrink-0 w-[280px] sm:w-[300px] md:w-[320px] rounded-xl border border-wf-border bg-ivory p-5 flex flex-col min-h-[220px]"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div>
                        <p className="font-semibold text-wf-black text-sm">{review.name}</p>
                        <p className="flex items-center gap-1 text-xs text-wf-gray mt-0.5">
                          <VerifiedBadge className="w-3.5 h-3.5 text-wf-black shrink-0" />
                          Verified Customer
                        </p>
                      </div>
                      <Stars rating={review.rating} size={13} />
                    </div>

                    <p className="text-sm text-wf-black/90 leading-relaxed mt-3 flex-1">
                      <span className="italic text-wf-gray">{review.product}. </span>
                      {review.text}
                    </p>

                    <p className="text-[11px] text-wf-gray/80 mt-4 text-right">{review.meta}</p>
                  </article>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => scrollByCard(1)}
              disabled={!canNext}
              aria-label="Next reviews"
              className="hidden sm:flex shrink-0 w-8 h-8 items-center justify-center rounded-full border border-wf-border text-wf-gray hover:text-wf-black hover:border-wf-black disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
