"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/products/ProductCard";

type CarouselFragrance = Parameters<typeof ProductCard>[0]["fragrance"];

interface ProductCarouselProps {
  title?: string;
  fragrances: CarouselFragrance[];
}

export function ProductCarousel({
  title = "You May Also Like",
  fragrances,
}: ProductCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || fragrances.length < 2) return;

    let frame = 0;
    const tick = () => {
      if (!pausedRef.current) {
        el.scrollLeft += 0.55;
        const loopAt = el.scrollWidth / 2;
        if (loopAt > 0 && el.scrollLeft >= loopAt) {
          el.scrollLeft -= loopAt;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [fragrances.length]);

  if (fragrances.length === 0) return null;

  const loop = fragrances.length > 1 ? [...fragrances, ...fragrances] : fragrances;

  function scrollByCard(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-carousel-card]");
    const width = card?.offsetWidth ?? 180;
    el.scrollBy({ left: direction * (width + 16), behavior: "smooth" });
  }

  return (
    <section className="mt-20">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="font-playfair text-2xl">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            className="w-9 h-9 border border-espresso flex items-center justify-center hover:bg-espresso hover:text-ivory transition-colors"
            aria-label="Previous products"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            className="w-9 h-9 border border-espresso flex items-center justify-center hover:bg-espresso hover:text-ivory transition-colors"
            aria-label="Next products"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        onMouseEnter={() => {
          pausedRef.current = true;
        }}
        onMouseLeave={() => {
          pausedRef.current = false;
        }}
        onTouchStart={() => {
          pausedRef.current = true;
        }}
        onTouchEnd={() => {
          pausedRef.current = false;
        }}
      >
        {loop.map((fragrance, index) => (
          <div
            key={`${fragrance.id}-${index}`}
            data-carousel-card
            className="w-[46%] sm:w-[31%] md:w-[23%] lg:w-[15.5%] xl:w-[15.2%] shrink-0"
          >
            <ProductCard fragrance={fragrance} animate={false} />
          </div>
        ))}
      </div>
    </section>
  );
}
