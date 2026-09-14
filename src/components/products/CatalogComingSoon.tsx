import Link from "next/link";
import { CATALOGS, FASHION_CATALOGS, type CatalogSlug } from "@/lib/product-catalog";

interface CatalogComingSoonProps {
  catalog: CatalogSlug;
  label: string;
}

export function CatalogComingSoon({ catalog, label }: CatalogComingSoonProps) {
  const otherSlugs = FASHION_CATALOGS.filter((slug) => slug !== catalog).slice(0, 4);

  return (
    <div className="mx-auto max-w-xl py-16 sm:py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mocha mb-3">
        Coming soon
      </p>
      <h2 className="font-playfair text-3xl sm:text-4xl text-espresso mb-4">{label}</h2>
      <p className="text-sm sm:text-base text-mocha leading-relaxed mb-8">
        We&apos;re curating our {label.toLowerCase()} collection for men and women. Check back
        soon — new pieces are on the way.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link href="/fragrances" className="btn-gold px-6 py-2.5 text-sm">
          Shop perfumes
        </Link>
        <Link href="/" className="btn-outline px-6 py-2.5 text-sm">
          Back to home
        </Link>
      </div>
      {otherSlugs.length > 0 && (
        <div className="mt-12 pt-8 border-t border-wf-border">
          <p className="text-xs uppercase tracking-wider text-wf-gray mb-4">
            Browse other categories
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {otherSlugs.map((slug) => (
              <Link
                key={slug}
                href={CATALOGS[slug].path}
                className="rounded-full bg-[#f1f1f1] px-4 py-2 text-sm text-[#03045e] hover:bg-[#e8e8e8] transition-colors"
              >
                {CATALOGS[slug].label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
