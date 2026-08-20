import type { Metadata } from "next";
import { SeasonalGuide } from "@/components/perfume/PremiumRecommenders";
import { getLatestFragrances } from "@/lib/fragrances";
import { absoluteUrl, defaultOgImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Seasonal Scent Guide",
  description: "What perfume to wear each season - tips and curated picks.",
  alternates: { canonical: absoluteUrl("/seasonal-guide") },
  openGraph: {
    title: "Seasonal Scent Guide | COSY AURA",
    description: "Season-by-season fragrance guidance.",
    url: absoluteUrl("/seasonal-guide"),
    images: [defaultOgImage()],
  },
};

export const revalidate = 300;

export default async function SeasonalGuidePage() {
  const catalog = await getLatestFragrances(48);
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
      <h1 className="font-playfair text-3xl md:text-4xl mb-2">
        Seasonal Scent Guide
      </h1>
      <p className="text-sm text-wf-gray mb-10 max-w-2xl">
        Heat lifts projection; cold muffles it. Dress your scent for the weather.
      </p>
      <SeasonalGuide
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
