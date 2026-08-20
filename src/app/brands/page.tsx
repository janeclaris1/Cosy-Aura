import type { Metadata } from "next";
import Link from "next/link";
import { getAllBrands } from "@/lib/fragrances";
import { absoluteUrl, defaultOgImage, SEO } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "All Brands",
  description: "Browse every house in the COSY AURA oil-perfume atelier.",
  alternates: { canonical: absoluteUrl("/brands") },
  openGraph: {
    type: "website",
    title: `All Brands | ${SEO.title.split("|")[0]?.trim() || "COSY AURA"}`,
    description: "Shop oil-based perfume oils by original house.",
    url: absoluteUrl("/brands"),
    images: [defaultOgImage()],
  },
};

export default async function BrandsPage() {
  const brands = await getAllBrands();

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
      <p className="text-[11px] uppercase tracking-[0.16em] text-mocha mb-2">
        Atelier
      </p>
      <h1 className="font-playfair text-3xl md:text-4xl mb-3">All Brands</h1>
      <p className="text-sm text-mocha mb-10 max-w-xl">
        Every house we interpret as an alcohol-free perfume oil.
      </p>

      {brands.length === 0 ? (
        <p className="text-mocha">No brands available yet.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-3 border-t border-wf-border pt-8">
          {brands.map((brand) => (
            <li key={brand.id}>
              <Link
                href={`/fragrances/${brand.slug}`}
                className="text-sm text-espresso hover:text-highlight transition-colors"
              >
                {brand.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
