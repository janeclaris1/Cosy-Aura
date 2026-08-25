import type { Metadata } from "next";
import { GiftFinder } from "@/components/perfume/PremiumRecommenders";
import { getFragrances } from "@/lib/fragrances";
import { absoluteUrl, defaultOgImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Gift Discovery",
  description:
    "Find the perfect perfume gift by personality — full matches with current deals.",
  alternates: { canonical: absoluteUrl("/gift-finder") },
  openGraph: {
    title: "Gift Discovery | COSY AURA",
    description: "Perfume gifts matched to personality, with store deals.",
    url: absoluteUrl("/gift-finder"),
    images: [defaultOgImage()],
  },
};

export const revalidate = 300;

export default async function GiftFinderPage() {
  const { fragrances: catalog } = await getFragrances({ limit: 500, page: 1 });

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
      <h1 className="font-playfair text-3xl md:text-4xl mb-2">Gift Discovery</h1>
      <p className="text-sm text-wf-gray mb-10 max-w-2xl">
        Choose a personality — we surface every matching bottle with current
        store deals.
      </p>
      <GiftFinder
        catalog={catalog.map((f) => ({
          id: f.id,
          slug: f.slug,
          model: f.model,
          price: f.price,
          stock: f.stock,
          fragranceFamily: f.fragranceFamily,
          concentration: f.concentration,
          sillage: f.sillage,
          sustainabilityScore: f.sustainabilityScore,
          isVegan: f.isVegan,
          brand: f.brand,
          images: f.images,
          countryStocks: f.countryStocks,
          viewCount: f.viewCount,
          likeCount: f.likeCount,
        }))}
      />
    </div>
  );
}
