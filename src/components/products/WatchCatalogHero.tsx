import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { catalogPlaceholder, productDetailPath } from "@/lib/product-catalog";
import type { FragranceWithRelations } from "@/lib/fragrances-shared";

interface WatchCatalogHeroProps {
  watches: FragranceWithRelations[];
}

function heroImage(watch: FragranceWithRelations): string {
  return watch.images[0]?.url ?? catalogPlaceholder("WATCH");
}

export function WatchCatalogHero({ watches }: WatchCatalogHeroProps) {
  if (!watches.length) return null;

  const panels = [...watches.slice(0, 3)];
  while (panels.length < 3) {
    panels.push(panels[panels.length - 1]!);
  }
  const [left, center, right] = panels;

  return (
    <section className="watch-catalog-hero relative overflow-hidden bg-[#0c0c0e] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,255,255,0.08) 0%, transparent 55%), linear-gradient(135deg, #141418 0%, #0a0a0c 45%, #050508 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        aria-hidden
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="watch-catalog-hero__slash watch-catalog-hero__slash--a" aria-hidden />
      <div className="watch-catalog-hero__slash watch-catalog-hero__slash--b" aria-hidden />

      <div className="relative mx-auto max-w-[1500px] px-4 pt-8 pb-10 sm:px-6 sm:pt-10 sm:pb-12">
        <div className="mb-6 flex justify-center sm:mb-8">
          <BrandLogo variant="dark" size="md" />
        </div>

        <div className="relative grid min-h-[280px] grid-cols-1 items-center gap-6 md:min-h-[320px] md:grid-cols-3 md:gap-0 lg:min-h-[360px]">
          <div className="relative flex flex-col items-center justify-center md:items-start md:pl-4 lg:pl-8">
            <Link
              href={productDetailPath("WATCH", left.slug)}
              className="group relative z-10 mb-4 block md:mb-0"
            >
              <div className="relative h-36 w-36 sm:h-44 sm:w-44 lg:h-52 lg:w-52">
                <Image
                  src={heroImage(left)}
                  alt={`${left.brand.name} ${left.model}`}
                  fill
                  className="object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.65)] transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 144px, 208px"
                  priority
                />
              </div>
            </Link>
            <p className="watch-catalog-hero__label mt-4 text-center md:mt-0 md:text-left">
              <span className="block">CURATED</span>
              <span className="block">FOR YOU</span>
            </p>
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            <p className="watch-catalog-hero__headline mb-2">
              <span className="block text-white/90">LUXURY</span>
              <span className="block text-[#FFD200]">WATCHES</span>
            </p>
            <p className="max-w-xs text-xs leading-relaxed text-white/55 sm:text-sm">
              Authentic timepieces — Rolex, Patek Philippe, and selected brands with secure
              checkout.
            </p>
            {center && (
              <Link
                href={productDetailPath("WATCH", center.slug)}
                className="group relative mt-5 hidden md:block"
              >
                <div className="relative h-28 w-28 lg:h-36 lg:w-36">
                  <Image
                    src={heroImage(center)}
                    alt={`${center.brand.name} ${center.model}`}
                    fill
                    className="object-contain opacity-90 drop-shadow-[0_16px_32px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-105"
                    sizes="144px"
                  />
                </div>
              </Link>
            )}
          </div>

          <div className="relative flex flex-col items-center justify-center md:items-end md:pr-4 lg:pr-8">
            <Link
              href={productDetailPath("WATCH", right.slug)}
              className="group relative z-10 mb-4 block md:mb-0 md:order-2"
            >
              <div className="relative h-36 w-36 sm:h-44 sm:w-44 lg:h-52 lg:w-52">
                <Image
                  src={heroImage(right)}
                  alt={`${right.brand.name} ${right.model}`}
                  fill
                  className="object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.65)] transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 144px, 208px"
                />
              </div>
            </Link>
            <p className="watch-catalog-hero__label mt-4 text-center md:order-1 md:mt-0 md:text-right">
              <span className="block">AUTHENTIC</span>
              <span className="block text-[#FFD200]">PIECES</span>
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-8 flex justify-center sm:mt-10">
          <a
            href="#watch-catalog"
            className="inline-flex items-center gap-2 bg-[#FFD200] px-8 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[#03045e] transition-colors hover:bg-[#e6bc00]"
          >
            Shop collection
            <span aria-hidden>›</span>
          </a>
        </div>
      </div>
    </section>
  );
}
