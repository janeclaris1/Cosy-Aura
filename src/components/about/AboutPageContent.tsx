import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Handshake, LayoutGrid, Brain, Compass } from "lucide-react";
import { prisma } from "@/lib/prisma";

const HERO_BRANDS = [
  { name: "Chanel", slug: "chanel" },
  { name: "Dior", slug: "dior" },
  { name: "Tom Ford", slug: "tom-ford" },
  { name: "Creed", slug: "creed" },
  { name: "Byredo", slug: "byredo" },
  { name: "Maison Francis Kurkdjian", slug: "maison-francis-kurkdjian" },
];

const MEDIA = {
  hero: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=1600&h=1000&fit=crop",
  cardOne: "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&h=600&fit=crop",
  cardTwo: "https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=800&h=600&fit=crop",
  service: "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=800&h=600&fit=crop",
  returns: "https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=800&h=600&fit=crop",
  stats: "https://images.unsplash.com/photo-1547887538-8476a0d0a5a4?w=800&h=600&fit=crop",
};

const PILLARS = [
  {
    icon: Handshake,
    title: "Service",
    body: "Outstanding customer care is central to how we work. From first enquiry to delivery, our team guides you through a clear and secure purchase with support at every step.",
  },
  {
    icon: LayoutGrid,
    title: "Choice",
    body: "Explore a wide catalog of floral, woody, and niche fragrances across houses including Chanel, Dior, Tom Ford, Creed, Byredo, and Maison Francis Kurkdjian.",
  },
  {
    icon: Brain,
    title: "Knowledge",
    body: "We help you compare concentrations, notes, and bottle sizes so you can choose with confidence whether this is your first luxury fragrance or your next signature scent.",
  },
  {
    icon: Compass,
    title: "Independence",
    body: "We are not tied to a single manufacturer. That gives you impartial guidance and the freedom to shop many brands in one place at transparent listed prices.",
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

export async function AboutPageContent() {
  const { fragranceCount, brandCount } = await getAboutStats();
  const fragrancesLabel =
    fragranceCount >= 1000
      ? `${Math.floor(fragranceCount / 100) * 100}+`
      : fragranceCount > 0
        ? String(fragranceCount)
        : "500+";

  return (
    <div className="bg-white font-cantora">
      <section className="relative min-h-[85vh] flex flex-col justify-center items-center text-center text-white overflow-hidden">
        <Image
          src={MEDIA.hero}
          alt="Luxury fragrance bottle photographed in studio lighting"
          fill
          priority
          className="object-cover object-center grayscale"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/60" aria-hidden />
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-24 md:py-32">
          <p className="text-xs uppercase tracking-[0.25em] text-white/70 mb-6">
            COSY AURA
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] leading-snug md:leading-tight tracking-tight">
            Global luxury fragrance selection, trusted support, and secure checkout
            come together to help you find your next scent.
          </h1>
        </div>

        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pb-16 md:pb-20 mt-auto">
          <p className="text-xs sm:text-sm text-white/80 mb-8 max-w-2xl mx-auto">
            Brands we carry include
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 opacity-90">
            {HERO_BRANDS.map((brand) => (
              <Link
                key={brand.name}
                href={`/fragrances/${brand.slug}`}
                className="hover:opacity-100 opacity-80 transition-opacity"
                aria-label={brand.name}
              >
                <span className="font-playfair text-lg md:text-xl text-white">
                  {brand.name}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <a
          href="#welcome"
          className="relative z-10 pb-8 text-white/70 hover:text-white transition-colors"
          aria-label="Scroll to learn more"
        >
          <ChevronDown className="w-6 h-6 animate-bounce" />
        </a>
      </section>

      <section id="welcome" className="max-w-5xl mx-auto px-6 py-16 md:py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-wf-black mb-8">
          Welcome To COSY AURA
        </h2>
        <p className="text-wf-gray text-base md:text-lg leading-relaxed max-w-3xl mx-auto mb-14 md:mb-20">
          COSY AURA is a curated destination for brand new luxury
          fragrances. With hundreds of references across {brandCount || "15"}+ brands
          including Chanel, Dior, Tom Ford, Creed, Byredo, and Hermès,
          plus secure checkout and worldwide delivery after payment
          confirmation, this is a reliable place to discover your next fragrance.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 text-left">
          <div>
            <div className="relative aspect-[4/3] bg-wf-light overflow-hidden mb-4">
              <Image
                src={MEDIA.cardOne}
                alt="Close-up of a premium perfume bottle and glass"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <h3 className="text-xl font-bold text-wf-black">Curated Inventory</h3>
          </div>
          <div>
            <div className="relative aspect-[4/3] bg-wf-light overflow-hidden mb-4">
              <Image
                src={MEDIA.cardTwo}
                alt="Fragrance shown in a lifestyle setup for digital shopping"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <h3 className="text-xl font-bold text-wf-black">Transparent Value</h3>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-16 md:pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14">
          <div>
            <div className="relative aspect-[4/3] bg-wf-light overflow-hidden mb-5">
              <Image
                src={MEDIA.service}
                alt="High-end perfume photographed to show bottle and finishing"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <h3 className="text-xl font-bold text-wf-black mb-3">Secure Fulfillment</h3>
            <p className="text-wf-gray text-[15px] leading-relaxed">
              Every order is prepared only after payment is confirmed. Fragrances are
              checked, packed with care, and dispatched with tracked international
              shipping via Aramex, FedEx, or DHL Express so you always know where
              your piece is from checkout to delivery.
            </p>
          </div>
          <div>
            <div className="relative aspect-[4/3] bg-wf-light overflow-hidden mb-5">
              <Image
                src={MEDIA.returns}
                alt="Premium fragrance and packaging to represent protected delivery"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <h3 className="text-xl font-bold text-wf-black mb-3">14-Day Returns</h3>
            <p className="text-wf-gray text-[15px] leading-relaxed">
              Buying a luxury fragrance online should feel straightforward. With 14
              days to change your mind, you can shop with confidence. If needed,
              return your fragrance unused in original packaging for a full refund.
            </p>
          </div>
        </div>
      </section>

      <section className="relative min-h-[420px] md:min-h-[480px] flex items-stretch overflow-hidden">
        <Image
          src={MEDIA.stats}
          alt="Luxury fragrance collection highlighting variety in stock"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="relative z-10 flex items-center">
          <div className="bg-white/95 backdrop-blur-sm px-8 py-10 md:px-12 md:py-14 min-w-[240px] md:min-w-[280px] shadow-lg">
            <ul className="space-y-8">
              <li>
                <p className="text-3xl md:text-4xl font-bold text-gold tabular-nums">2024</p>
                <p className="text-sm text-wf-gray mt-1">Store founded</p>
              </li>
              <li>
                <p className="text-3xl md:text-4xl font-bold text-gold tabular-nums">
                  {fragrancesLabel}
                </p>
                <p className="text-sm text-wf-gray mt-1">Fragrances available now</p>
              </li>
              <li>
                <p className="text-3xl md:text-4xl font-bold text-gold tabular-nums">
                  {brandCount || "15"}+
                </p>
                <p className="text-sm text-wf-gray mt-1">Luxury brands</p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-14">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <Icon className="w-8 h-8 text-gold mb-4 stroke-[1.5]" aria-hidden />
              <h3 className="text-xl font-bold text-wf-black mb-3">{title}</h3>
              <p className="text-wf-gray text-[15px] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-wf-border bg-wf-light">
        <div className="max-w-5xl mx-auto px-6 py-14 md:py-16 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl text-wf-black mb-2">Find your next fragrance</h2>
            <p className="text-sm text-wf-gray">
              Browse the full catalog or speak with our team first.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link href="/fragrances" className="btn-gold">
              Browse Fragrances
            </Link>
            <Link href="/contact" className="btn-outline">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
