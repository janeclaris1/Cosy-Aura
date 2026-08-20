import type { Metadata } from "next";
import { CompareTable } from "@/components/perfume/CompareTable";
import { absoluteUrl, defaultOgImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Perfume Compare",
  description: "Compare luxury perfumes side-by-side - notes, longevity, sillage, and price.",
  alternates: { canonical: absoluteUrl("/compare") },
  openGraph: {
    title: "Perfume Compare | COSY AURA",
    description: "Side-by-side perfume comparison.",
    url: absoluteUrl("/compare"),
    images: [defaultOgImage()],
  },
};

export default function ComparePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
      <h1 className="font-playfair text-3xl md:text-4xl mb-2">Perfume Compare</h1>
      <p className="text-sm text-wf-gray mb-8">
        Up to three fragrances - notes, longevity, and presence at a glance.
      </p>
      <CompareTable />
    </div>
  );
}
