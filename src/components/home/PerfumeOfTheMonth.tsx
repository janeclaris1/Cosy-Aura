import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { getRandomFragrances } from "@/lib/fragrances";
import { formatPrice } from "@/lib/utils";
import { inspiredByLine } from "@/lib/inspired-by";
import { LOCALE_COOKIE, parseLocaleCookie } from "@/lib/locale-cookie";
import { translate } from "@/lib/i18n";
import { salePriceForSize } from "@/lib/pricing";
import { resolveRegionalPriceGhs } from "@/lib/regional-pricing-server";
import { applyLocaleCookieToMoney } from "@/lib/money-display";
import Image from "next/image";

/** Perfume of the Month - random bottle on each page load */
export async function PerfumeOfTheMonth() {
  noStore();
  const loc = parseLocaleCookie((await cookies()).get(LOCALE_COOKIE)?.value);
  const currency = loc?.currency || "GHS";
  const language = loc?.language || "en";
  applyLocaleCookieToMoney(loc);
  const [perfume] = await getRandomFragrances(1);
  if (!perfume) return null;

  const displayPrice = await resolveRegionalPriceGhs(
    salePriceForSize(50, perfume.slug),
    loc?.country
  );

  return (
    <section className="py-16 px-4 bg-ivory border-y border-wf-border text-espresso">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div className="relative aspect-square max-w-md mx-auto w-full bg-ivory overflow-hidden">
          <Image
            src={perfume.images[0]?.url || "/images/placeholders/fragrance.svg"}
            alt={perfume.model}
            fill
            className="object-contain"
            sizes="(max-width:768px) 90vw, 40vw"
          />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-highlight mb-3">
            {translate(language, "home.potm")}
          </p>
          <h2 className="font-playfair text-3xl md:text-4xl mb-1">
            {perfume.brand.name} {perfume.model}
          </h2>
          <p className="text-mocha text-base mb-2">
            {inspiredByLine(perfume.brand.name, perfume.model)}
          </p>
          <p className="text-mocha text-sm mb-4">
            {perfume.concentration} · {perfume.bottleSize} ml ·{" "}
            {formatPrice(displayPrice, currency)}
          </p>
          <p className="text-espresso/80 leading-relaxed mb-6 line-clamp-4">
            {perfume.description}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={`/fragrances/${perfume.slug}`} className="btn-gold">
              Shop this bottle
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center px-5 py-2.5 border border-espresso/20 text-sm text-espresso hover:border-highlight hover:text-highlight transition-colors"
            >
              Watch Scent Talk
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
