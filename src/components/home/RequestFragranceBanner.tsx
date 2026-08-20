"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useT } from "@/lib/locale-store";

export function RequestFragranceBanner() {
  const t = useT();

  return (
    <section className="relative overflow-hidden bg-wf-black">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 min-h-[280px] md:min-h-[320px]">
        <div className="relative z-10 flex flex-col justify-center px-6 py-12 md:px-10 lg:px-12">
          <h2 className="font-playfair text-3xl md:text-4xl lg:text-[2.75rem] leading-[1.15] text-white mb-4 max-w-md">
            {t("home.requestTitle")}
          </h2>
          <p className="text-white/80 text-sm md:text-base mb-8 max-w-md leading-relaxed">
            {t("home.requestBody")}
          </p>

          <Link
            href="/contact?subject=Request%20a%20Fragrance"
            className="group inline-flex items-center justify-center gap-3 self-start bg-white text-wf-black px-7 py-3.5 text-xs tracking-[0.2em] uppercase font-medium hover:bg-gold hover:text-white transition-colors"
          >
            {t("home.requestCta")}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="relative min-h-[240px] lg:min-h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-wf-black via-wf-black/70 to-transparent z-[1] hidden lg:block" />
          <div className="absolute inset-0 bg-gradient-to-t from-wf-black/80 via-transparent to-transparent z-[1] lg:hidden" />
          <Image
            src="/images/fragrances/new/oil-imagination.png"
            alt="Luxury fragrance bottle"
            fill
            className="object-contain object-center bg-accent"
            sizes="(max-width: 1024px) 100vw, 50vw"
            unoptimized
          />
          <div className="absolute inset-0 bg-primary/30 mix-blend-multiply" />
        </div>
      </div>
    </section>
  );
}
