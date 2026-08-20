import type { Metadata } from "next";
import { FragranceQuiz } from "@/components/perfume/FragranceQuiz";
import { getLatestFragrances } from "@/lib/fragrances";
import { absoluteUrl, defaultOgImage, SEO } from "@/lib/seo";

const title = "Fragrance Finder Quiz";
const description =
  "Take our 7-question fragrance finder to discover artisan perfumes matched to your mood, scent family, and sustainability values.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [...SEO.keywords, "fragrance quiz", "perfume finder"],
  alternates: { canonical: absoluteUrl("/fragrance-finder") },
  openGraph: {
    type: "website",
    title: `${title} | COSY AURA`,
    description,
    url: absoluteUrl("/fragrance-finder"),
    siteName: "COSY AURA",
    images: [defaultOgImage()],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | COSY AURA`,
    description,
    images: [defaultOgImage().url],
  },
};

export const revalidate = 300;

export default async function FragranceFinderPage() {
  const catalog = await getLatestFragrances(48);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
      <FragranceQuiz
        catalog={catalog.map((f) => ({
          id: f.id,
          slug: f.slug,
          model: f.model,
          price: f.price,
          fragranceFamily: f.fragranceFamily,
          sillage: f.sillage,
          gender: f.gender,
          sustainabilityScore: f.sustainabilityScore,
          isVegan: f.isVegan,
          isCrueltyFree: f.isCrueltyFree,
          brand: f.brand,
          images: f.images,
        }))}
      />
    </div>
  );
}
