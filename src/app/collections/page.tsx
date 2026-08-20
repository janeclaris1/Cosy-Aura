import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/products/ProductCard";
import { getFragrances, getLatestFragrances } from "@/lib/fragrances";
import { absoluteUrl, defaultOgImage } from "@/lib/seo";
import { COLLECTION_OPTIONS } from "@/lib/filter-options";
import { currentSeasonId, SEASONS } from "@/lib/scent-intelligence";

export const metadata: Metadata = {
  title: "Seasonal Collections",
  description: "Limited editions and seasonal perfume collections.",
  alternates: { canonical: absoluteUrl("/collections") },
  openGraph: {
    title: "Seasonal Collections | COSY AURA",
    description: "Limited editions and seasonal edits.",
    url: absoluteUrl("/collections"),
    images: [defaultOgImage()],
  },
};

export const revalidate = 300;

export default async function CollectionsPage() {
  const season = SEASONS.find((s) => s.id === currentSeasonId()) || SEASONS[0];
  const byCollection = await Promise.all(
    COLLECTION_OPTIONS.map(async (c) => {
      const { fragrances } = await getFragrances({
        collections: [c.value],
        limit: 4,
      });
      return { ...c, fragrances };
    })
  );
  const seasonal = await getLatestFragrances(8);
  const seasonalMatch = seasonal.filter((f) =>
    (season.families as readonly string[]).includes(f.fragranceFamily)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
      <h1 className="font-playfair text-3xl md:text-4xl mb-2">
        Seasonal Collections
      </h1>
      <p className="text-sm text-wf-gray mb-10 max-w-2xl">
        Limited edits and curated capsules. Right now we&apos;re leaning into{" "}
        <span className="text-espresso font-medium">{season.label}</span> -{" "}
        {season.blurb}
      </p>

      <section className="mb-14">
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-playfair text-2xl">{season.label} edit</h2>
          <Link href="/seasonal-guide" className="text-sm text-gold hover:text-gold-light">
            Seasonal guide →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {(seasonalMatch.length ? seasonalMatch : seasonal).slice(0, 4).map((f) => (
            <ProductCard key={f.id} fragrance={f} />
          ))}
        </div>
      </section>

      {byCollection.map((block) =>
        block.fragrances.length ? (
          <section key={block.value} className="mb-14">
            <div className="flex items-end justify-between mb-6">
              <h2 className="font-playfair text-2xl">{block.label}</h2>
              <Link
                href={`/fragrances?collection=${block.value}`}
                className="text-sm text-gold hover:text-gold-light"
              >
                Shop {block.label} →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {block.fragrances.map((f) => (
                <ProductCard key={f.id} fragrance={f} />
              ))}
            </div>
          </section>
        ) : null
      )}
    </div>
  );
}
