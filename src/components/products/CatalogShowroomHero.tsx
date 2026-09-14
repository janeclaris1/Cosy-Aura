import Image from "next/image";
import Link from "next/link";
import { catalogPlaceholder, getCatalog, type CatalogSlug } from "@/lib/product-catalog";
import type { FragranceWithRelations } from "@/lib/fragrances-shared";

const ACCRA_MAPS =
  "https://www.google.com/maps/search/?api=1&query=15+Odaw+Street+Kokomlemle+Accra+Ghana";

interface CatalogShowroomHeroProps {
  catalog: CatalogSlug;
  products?: FragranceWithRelations[];
  catalogAnchorId?: string;
}

function heroImage(product: FragranceWithRelations): string {
  return (
    product.images[0]?.url ?? catalogPlaceholder(product.productType ?? "PERFUME")
  );
}

export function CatalogShowroomHero({
  catalog,
  products = [],
  catalogAnchorId,
}: CatalogShowroomHeroProps) {
  const featured = products[0];
  const config = getCatalog(catalog);
  const pickupHref = catalogAnchorId ? `#${catalogAnchorId}` : ACCRA_MAPS;

  return (
    <section className="watch-showroom-hero border-b border-wf-border bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="watch-showroom-hero__visual relative aspect-[4/5] min-h-[320px] bg-[#080810] md:aspect-auto md:min-h-[480px]">
          <div className="absolute inset-x-0 top-0 z-10 flex h-14 items-center justify-center bg-[#03045e] px-6">
            <span className="font-roboto text-xs font-bold tracking-[0.35em] text-white">
              COSY AURA
            </span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center px-8 pb-8 pt-14">
            <div className="relative aspect-[3/4] w-full max-w-[280px] border border-white/10 bg-black/40">
              {featured ? (
                <Image
                  src={heroImage(featured)}
                  alt={`${featured.brand.name} ${featured.model}`}
                  fill
                  className="object-contain p-6"
                  sizes="(max-width: 768px) 80vw, 40vw"
                  priority
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center px-8 py-12 md:px-12 md:py-16 lg:px-16 lg:py-20">
          <p className="font-roboto text-xs font-bold uppercase tracking-[0.2em] text-[#03045e]">
            Accra
          </p>
          <h1 className="font-playfair mt-3 text-3xl font-semibold text-[#03045e] md:text-4xl">
            The Showroom
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-wf-gray">
            The Cosy Aura boutique welcomes you at{" "}
            <a
              href={ACCRA_MAPS}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#03045e] underline decoration-[#03045e]/40 underline-offset-2 hover:decoration-[#03045e]"
            >
              15 Odaw Street, Kokomlemle
            </a>{" "}
            in Accra, where you can discover {config.showroomTeaser} and enjoy a
            personalized experience with our team.
          </p>
          <p className="mt-6 text-sm font-semibold text-[#03045e]">
            Monday to Saturday{" "}
            <span className="font-normal text-wf-gray">from 8 a.m. to 6 p.m.</span>
          </p>
          <p className="mt-2 text-sm text-wf-gray">
            Store pickup also available in Yaoundé and Mamfe — select at checkout.
          </p>
          <div className="mt-10">
            <Link
              href={pickupHref}
              {...(!catalogAnchorId
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="inline-flex items-center rounded-full bg-[#03045e] px-8 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#020338]"
            >
              Store Pickup
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
