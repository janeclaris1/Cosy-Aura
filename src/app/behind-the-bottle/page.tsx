import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PERFUMER_STORIES } from "@/lib/scent-intelligence";
import { absoluteUrl, defaultOgImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Behind the Bottle",
  description: "Meet the perfumers behind Cosy Aura compositions.",
  alternates: { canonical: absoluteUrl("/behind-the-bottle") },
  openGraph: {
    title: "Behind the Bottle | COSY AURA",
    description: "Perfumer stories from the atelier.",
    url: absoluteUrl("/behind-the-bottle"),
    images: [defaultOgImage()],
  },
};

export default function BehindTheBottlePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
      <h1 className="font-playfair text-3xl md:text-4xl mb-2">Behind the Bottle</h1>
      <p className="text-sm text-wf-gray mb-12 max-w-2xl">
        The noses, rituals, and places that shape our compositions.
      </p>

      <div className="space-y-16">
        {PERFUMER_STORIES.map((p, i) => (
          <article
            key={p.slug}
            id={p.slug}
            className={`grid md:grid-cols-2 gap-8 items-center ${
              i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
            }`}
          >
            <div className="relative aspect-[4/5] bg-[#f3f4f6] overflow-hidden">
              <Image
                src={p.image}
                alt={`${p.name} — Cosy Aura perfume oil`}
                fill
                className="object-contain p-8 md:p-12"
                sizes="(max-width:768px) 100vw, 50vw"
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-gold mb-2">
                {p.title}
              </p>
              <h2 className="font-playfair text-3xl mb-2">{p.name}</h2>
              <p className="text-sm text-mocha mb-4">Focus · {p.focus}</p>
              <p className="text-wf-gray leading-relaxed mb-4">{p.excerpt}</p>
              <p className="text-sm text-mocha leading-relaxed whitespace-pre-line">
                {p.body}
              </p>
              <Link href="/fragrances" className="inline-block mt-6 text-sm text-gold hover:text-gold-light">
                Shop compositions →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
