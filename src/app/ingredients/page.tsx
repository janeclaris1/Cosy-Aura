import type { Metadata } from "next";
import { IngredientsMap } from "@/components/perfume/IngredientsMap";
import { absoluteUrl, defaultOgImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Ingredients Map",
  description: "Explore the geographic origins of rare perfume ingredients.",
  alternates: { canonical: absoluteUrl("/ingredients") },
  openGraph: {
    title: "Ingredients Map | COSY AURA",
    description: "Origin stories of rare fragrance notes.",
    url: absoluteUrl("/ingredients"),
    images: [defaultOgImage()],
  },
};

export default function IngredientsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
      <IngredientsMap />
    </div>
  );
}
