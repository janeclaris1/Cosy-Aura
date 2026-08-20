import type { Metadata } from "next";
import { OccasionRecs } from "@/components/perfume/PremiumRecommenders";
import { getLatestFragrances } from "@/lib/fragrances";
import { absoluteUrl, defaultOgImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Occasion-Based Recommendations",
  description: "Perfume picks for date night, office, weekend, and more.",
  alternates: { canonical: absoluteUrl("/occasions") },
  openGraph: {
    title: "Occasion Recs | COSY AURA",
    description: "What to wear - by occasion.",
    url: absoluteUrl("/occasions"),
    images: [defaultOgImage()],
  },
};

export const revalidate = 300;

export default async function OccasionsPage() {
  const catalog = await getLatestFragrances(48);
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
      <h1 className="font-playfair text-3xl md:text-4xl mb-2">
        Occasion-Based Recs
      </h1>
      <p className="text-sm text-wf-gray mb-10 max-w-2xl">
        Date night, office, weekend - dial the bottle to the moment.
      </p>
      <OccasionRecs
        catalog={catalog.map((f) => ({
          id: f.id,
          slug: f.slug,
          model: f.model,
          price: f.price,
          fragranceFamily: f.fragranceFamily,
          concentration: f.concentration,
          sillage: f.sillage,
          brand: f.brand,
          images: f.images,
        }))}
      />
    </div>
  );
}
