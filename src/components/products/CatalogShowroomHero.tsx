"use client";

import Image from "next/image";
import Link from "next/link";
import { getCatalog, type CatalogSlug } from "@/lib/product-catalog";
import { useShopperCountry } from "@/lib/locale-store";
import { showroomLocationForCountry } from "@/lib/showroom-location";

export const CATALOG_SHOWROOM_IMAGE = "/images/catalog/showroom-interior.jpg";

interface CatalogShowroomHeroProps {
  catalog: CatalogSlug;
  catalogAnchorId?: string;
}

export function CatalogShowroomHero({
  catalog,
  catalogAnchorId,
}: CatalogShowroomHeroProps) {
  const config = getCatalog(catalog);
  const country = useShopperCountry();
  const location = showroomLocationForCountry(country);
  const pickupHref = catalogAnchorId ? `#${catalogAnchorId}` : location.mapsUrl;

  return (
    <section className="watch-showroom-hero border-b border-wf-border bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="watch-showroom-hero__visual relative aspect-[4/5] min-h-[320px] md:aspect-auto md:min-h-[480px]">
          <Image
            src={CATALOG_SHOWROOM_IMAGE}
            alt="Cosy Aura boutique showroom"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
          <div className="absolute inset-x-0 top-0 z-10 flex h-14 items-center justify-center bg-[#03045e] px-6">
            <span className="font-roboto text-xs font-bold tracking-[0.35em] text-white">
              COSY AURA
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-center px-8 py-12 md:px-12 md:py-16 lg:px-16 lg:py-20">
          <p className="font-roboto text-xs font-bold uppercase tracking-[0.2em] text-[#03045e]">
            {location.cityLabel}
          </p>
          <h1 className="font-playfair mt-3 text-3xl font-semibold text-[#03045e] md:text-4xl">
            {location.heading}
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-wf-gray">
            The Cosy Aura boutique welcomes you at{" "}
            <a
              href={location.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#03045e] underline decoration-[#03045e]/40 underline-offset-2 hover:decoration-[#03045e]"
            >
              {location.addressLine}
            </a>{" "}
            in {location.cityInBody}, where you can discover {config.showroomTeaser}{" "}
            and enjoy a personalized experience with our team.
          </p>
          <p className="mt-6 text-sm font-semibold text-[#03045e]">
            Monday to Saturday{" "}
            <span className="font-normal text-wf-gray">from 8 a.m. to 6 p.m.</span>
          </p>
          <p className="mt-2 text-sm text-wf-gray">{location.pickupNote}</p>
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
