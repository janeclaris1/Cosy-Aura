import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getGoogleReviews } from "@/lib/google-reviews";

const MEDIA = {
  hero: "/images/lifestyle/buy-with-confidence.png",
  authentic: "/images/fragrances/new/oil-black-orchid.png",
  stayInTouch: "/images/lifestyle/request-a-fragrance.png",
  talkToUs: "/images/fragrances/new/oil-club-de-nuit-intense.png",
};

const FALLBACK_TESTIMONIALS = [
  {
    name: "Ama",
    text: "The oil lasts all day on my skin - richer than sprays I have bought elsewhere. Delivery to Accra was quick and well packed.",
    rating: 5,
  },
  {
    name: "Jean",
    text: "Ordered from Yaounde and got clear WhatsApp updates. The scent is close to the house I love, without the alcohol burn.",
    rating: 5,
  },
  {
    name: "Kwame",
    text: "Transparent sizes and pricing. Tried a sample first, then went for 50ml. Support answered every question.",
    rating: 5,
  },
];

async function getAboutStats() {
  try {
    const [fragranceCount, brandCount] = await Promise.all([
      prisma.fragrance.count(),
      prisma.brand.count(),
    ]);
    return { fragranceCount, brandCount };
  } catch {
    return { fragranceCount: 0, brandCount: 0 };
  }
}

function Stars({ rating }: { rating: number }) {
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  const label = n + " out of 5 stars";
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={label}>
      <span className="inline-flex gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={
              i < n
                ? "w-3.5 h-3.5 fill-[#FFD200] text-[#FFD200]"
                : "w-3.5 h-3.5 text-[#c5c9d6]"
            }
          />
        ))}
      </span>
      <span className="text-xs tabular-nums text-[#03045e]">{n.toFixed(2)}</span>
    </span>
  );
}

export async function AboutPageContent() {
  const [{ fragranceCount, brandCount }, reviewsPayload] = await Promise.all([
    getAboutStats(),
    getGoogleReviews().catch(() => null),
  ]);

  const fragrancesLabel =
    fragranceCount >= 1000
      ? Math.floor(fragranceCount / 100) * 100 + "+"
      : fragranceCount > 0
        ? String(fragranceCount)
        : "200+";

  const brandsLabel = brandCount > 0 ? brandCount + "+" : "40+";

  const googleReviews = (reviewsPayload?.reviews || [])
    .filter((r) => r.text.trim().length > 40)
    .slice(0, 3)
    .map((r) => ({
      name: r.name.split(" ")[0] || r.name,
      text:
        r.text.length > 220 ? r.text.slice(0, 217).trim() + "..." : r.text,
      rating: r.rating || 5,
    }));

  const testimonials =
    googleReviews.length >= 3 ? googleReviews : FALLBACK_TESTIMONIALS;

  const reviewCount =
    reviewsPayload?.total && reviewsPayload.total > 0
      ? reviewsPayload.total
      : null;

  return (
    <div className="bg-white text-[#03045e]">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div>
            <h1 className="font-inter text-3xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight text-black mb-3">
              About Cosy Aura
            </h1>
            <p className="font-inter text-xl sm:text-2xl font-semibold text-black mb-6">
              Oil-based luxury. Close to skin.
            </p>
            <div className="bg-[#E8ECF8] px-5 py-4 mb-6">
              <p className="font-inter text-sm sm:text-base font-semibold text-[#03045e] leading-snug">
                Founded in 2021, Cosy Aura curates alcohol-free perfume oils with
                shops in Accra, Yaounde, and Mamfe - and {fragrancesLabel} scents
                online.
              </p>
            </div>
            <div className="space-y-4 text-[15px] sm:text-base leading-relaxed text-black">
              <p>
                Cosy Aura is built for people who want a lasting trail without
                alcohol sprays. Our oils sit warm on skin, with sizes from samples
                to 100ml, inspired by the great houses you already love.
              </p>
              <p>
                We fulfil from Ghana and Cameroon with secure checkout, WhatsApp
                support, and careful packing after payment. Whether you shop
                online from Accra or visit Yaounde and Mamfe, you get transparent
                pricing and guidance - not a hard sell.
              </p>
            </div>
          </div>
          <div className="relative aspect-[4/5] lg:aspect-auto lg:min-h-[520px] bg-[#f3f4f6] overflow-hidden">
            <Image
              src={MEDIA.hero}
              alt="Cosy Aura perfume oils arranged for discovery"
              fill
              priority
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#f5f5f5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,280px)_1fr] lg:grid-cols-[minmax(0,340px)_1fr] gap-10 md:gap-14 items-center">
            <div className="mx-auto w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] lg:w-[320px] lg:h-[320px] relative shrink-0">
              <div className="absolute inset-0 rounded-full overflow-hidden bg-white shadow-sm">
                <Image
                  src={MEDIA.authentic}
                  alt="Authentic Cosy Aura perfume oil bottle"
                  fill
                  className="object-contain p-6"
                  sizes="320px"
                />
              </div>
            </div>
            <div>
              <h2 className="font-inter text-2xl sm:text-3xl font-bold text-black mb-4">
                An authentic scent
              </h2>
              <p className="text-[15px] sm:text-base leading-relaxed text-black max-w-xl">
                We source carefully and check every oil before it leaves our
                shelves. Cosy Aura never sells knockoffs - only alcohol-free
                perfume oils prepared for lasting wear. Unhappy with an order?
                Return unused product in original packaging within 14 days for a
                full refund.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="font-inter text-xl sm:text-2xl font-bold tracking-wide uppercase text-black mb-3">
            Customer testimonials
          </h2>
          <p className="text-sm sm:text-base text-[#03045e]">
            Need to vet us further?{" "}
            {reviewCount ? (
              <>
                Over{" "}
                <strong>{reviewCount.toLocaleString()} positive reviews</strong>{" "}
                (and counting!) speak for themselves.
              </>
            ) : (
              <>
                Real customers across Ghana and Cameroon share how our oils wear
                day after day.
              </>
            )}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {testimonials.map((item) => (
            <blockquote
              key={item.name + "-" + item.text.slice(0, 24)}
              className="bg-[#E8ECF8] px-6 py-7 text-left"
            >
              <p className="font-playfair text-[15px] leading-relaxed text-[#03045e] mb-5">
                &ldquo;{item.text}&rdquo;
              </p>
              <footer>
                <p className="font-inter font-bold text-sm text-[#03045e]">
                  {item.name}
                </p>
                <p className="font-inter text-sm text-[#03045e] mb-2">
                  Verified buyer
                </p>
                <Stars rating={item.rating} />
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,280px)_1fr] lg:grid-cols-[minmax(0,320px)_1fr] gap-10 md:gap-14 items-center">
          <div className="mx-auto w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] lg:w-[300px] lg:h-[300px] relative shrink-0">
            <div className="absolute inset-0 rounded-full overflow-hidden bg-[#f5f5f5]">
              <Image
                src={MEDIA.stayInTouch}
                alt="Stay connected with Cosy Aura"
                fill
                className="object-cover"
                sizes="300px"
              />
            </div>
          </div>
          <div>
            <h2 className="font-inter text-2xl sm:text-3xl font-bold text-black mb-4">
              Stay in touch
            </h2>
            <p className="text-[15px] sm:text-base leading-relaxed text-black max-w-xl mb-6">
              We are here to help you feel and smell your absolute best. Browse
              the full oil collection, read scent stories in the Journal, or
              follow Cosy Aura on Instagram, TikTok, and our other channels for
              new drops and atelier notes.
            </p>
            <Link href="/fragrances" className="btn-gold inline-block">
              Shop now
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f7f7]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
              <h2 className="font-inter text-2xl sm:text-3xl font-bold text-black mb-5">
                Talk to us
              </h2>
              <div className="bg-[#E8ECF8] px-5 py-5 mb-6 text-center sm:text-left">
                <p className="font-inter text-sm sm:text-base">
                  <a
                    href="mailto:support@cosyaura.com"
                    className="font-semibold text-[#03045e] underline underline-offset-2 hover:text-[#0077b6]"
                  >
                    support@cosyaura.com
                  </a>
                </p>
              </div>
              <p className="text-[15px] sm:text-base leading-relaxed text-black mb-4">
                Questions about an order, tracking, bottle size, or which oil
                suits you? Our team in Ghana and Cameroon is ready to help -
                before you buy and after it ships.
              </p>
              <p className="text-sm text-[#6b6b6b] leading-relaxed">
                Visit us: Accra (15 Odaw Street, Kokomlemle) · Monte
                Meecham, Yaounde · Mamfe
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/contact" className="btn-gold">
                  Contact form
                </Link>
                <Link href="/faq" className="btn-outline">
                  FAQ
                </Link>
              </div>
            </div>
            <div className="relative aspect-[5/4] bg-white overflow-hidden">
              <Image
                src={MEDIA.talkToUs}
                alt="Cosy Aura fragrance oils ready for customers"
                fill
                className="object-contain p-8"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#e8e8e8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-12 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="font-inter text-2xl md:text-3xl font-bold tabular-nums text-[#03045e]">
              2021
            </p>
            <p className="text-xs sm:text-sm text-[#6b6b6b] mt-1">Founded</p>
          </div>
          <div>
            <p className="font-inter text-2xl md:text-3xl font-bold tabular-nums text-[#03045e]">
              {fragrancesLabel}
            </p>
            <p className="text-xs sm:text-sm text-[#6b6b6b] mt-1">Oils online</p>
          </div>
          <div>
            <p className="font-inter text-2xl md:text-3xl font-bold tabular-nums text-[#03045e]">
              {brandsLabel}
            </p>
            <p className="text-xs sm:text-sm text-[#6b6b6b] mt-1">
              Houses inspired
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
