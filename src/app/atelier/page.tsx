import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { absoluteUrl, defaultOgImage, SEO } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Perfume Atelier",
  description:
    "Premium Cosy Aura experiences - AR try-on, scent journal, compare, gift finder, subscriptions, and more.",
  alternates: { canonical: absoluteUrl("/atelier") },
  openGraph: {
    title: "Perfume Atelier | COSY AURA",
    description:
      "Explore premium fragrance tools: AR try-on, virtual nose, scent profile, and seasonal guides.",
    url: absoluteUrl("/atelier"),
    images: [defaultOgImage()],
    siteName: "COSY AURA",
  },
};

const FEATURES = [
  {
    href: "/compare",
    title: "Perfume Compare",
    blurb: "Side-by-side notes, longevity, and sillage.",
  },
  {
    href: "/scent-journal",
    title: "Scent Journal & Memory",
    blurb: "Log wears and keep private notes on every bottle.",
  },
  {
    href: "/scent-profile",
    title: "Scent Profile",
    blurb: "Build a preference atlas for smarter recommendations.",
  },
  {
    href: "/gift-finder",
    title: "Gift Discovery",
    blurb: "Match bottles to personality, not guesswork.",
  },
  {
    href: "/subscribe",
    title: "Subscription Service",
    blurb: "Monthly discovery sets curated for your profile.",
  },
  {
    href: "/collections",
    title: "Seasonal Collections",
    blurb: "Limited editions and seasonal edits.",
  },
  {
    href: "/behind-the-bottle",
    title: "Behind the Bottle",
    blurb: "Stories from the noses who compose our scents.",
  },
  {
    href: "/ingredients",
    title: "Ingredients Map",
    blurb: "Trace rare notes to their geographic origins.",
  },
  {
    href: "/occasions",
    title: "Occasion Recs",
    blurb: "Date night, office, weekend - dialed in.",
  },
  {
    href: "/seasonal-guide",
    title: "Seasonal Scent Guide",
    blurb: "What to wear as the weather shifts.",
  },
  {
    href: "/fragrance-finder",
    title: "Fragrance Finder",
    blurb: "Our classic matching quiz.",
  },
  {
    href: "/fragrances",
    title: "AR · Virtual Nose",
    blurb: "Open any product page for AR try-on and AI scent reading.",
  },
];

export default function AtelierPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
      <div className="max-w-3xl mb-12">
        <p className="text-xs uppercase tracking-[0.16em] text-gold mb-2">
          Step 10 · Premium
        </p>
        <h1 className="font-playfair text-4xl md:text-5xl mb-4">
          The Perfume Atelier
        </h1>
        <p className="text-wf-gray leading-relaxed">
          Tools for collectors who want more than a bottle - memory, ritual,
          discovery, and craft. {SEO.description}
        </p>
      </div>

      <div className="relative aspect-[21/9] mb-12 overflow-hidden rounded-lg bg-primary">
        <Image
          src="https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=1600&h=700&fit=crop"
          alt="Perfume atelier"
          fill
          className="object-cover opacity-70"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 text-ivory">
          <p className="font-playfair text-2xl md:text-3xl">
            Collect with intention.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {FEATURES.map((f) => (
          <Link
            key={f.href + f.title}
            href={f.href}
            className="group border border-wf-border bg-white p-5 hover:border-gold transition-colors duration-organic ease-organic"
          >
            <h2 className="font-playfair text-xl mb-2 group-hover:text-gold transition-colors">
              {f.title}
            </h2>
            <p className="text-sm text-wf-gray">{f.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
