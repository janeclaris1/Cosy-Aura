import Image from "next/image";
import Link from "next/link";

const FEATURED = {
  series: "CHANEL",
  title: "Chanel N°5",
  subtitle: "Iconic Floral",
  description:
    "The legendary floral aldehyde - a timeless signature scent that defines modern luxury perfume.",
  href: "/fragrances/chanel",
  image:
    "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&h=800&fit=crop",
  bgImage:
    "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1200&h=800&fit=crop",
};

const COLLECTIONS = [
  {
    label: "Dior",
    href: "/fragrances/dior",
    image:
      "https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=400&h=400&fit=crop",
    alt: "Dior perfume bottle",
  },
  {
    label: "Tom Ford",
    href: "/fragrances/tom-ford",
    image:
      "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=400&h=400&fit=crop",
    alt: "Tom Ford perfume bottle",
  },
  {
    label: "Creed",
    href: "/fragrances/creed",
    image:
      "https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=400&h=400&fit=crop",
    alt: "Creed perfume bottle",
  },
];

export function CitizenBrandBanner() {
  return (
    <section className="relative overflow-hidden bg-wf-black mb-2">
      {/* Background texture */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <Image
          src={FEATURED.bgImage}
          alt=""
          fill
          className="object-cover object-center scale-150 blur-2xl opacity-20"
          sizes="100vw"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-r from-wf-black via-wf-black/95 to-wf-black/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-wf-black/80 via-transparent to-wf-black/40" />
      </div>

      <div className="relative max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4 md:gap-5">
          {/* Featured hero card */}
          <Link
            href={FEATURED.href}
            className="group relative flex flex-col sm:flex-row overflow-hidden rounded-xl bg-wf-light hover:bg-white transition-colors duration-300 min-h-[280px] sm:min-h-[300px]"
          >
            <div className="relative flex-1 min-h-[200px] sm:min-h-0 flex items-center justify-center p-6 sm:p-8">
              <Image
                src={FEATURED.image}
                alt={FEATURED.title}
                width={420}
                height={420}
                className="object-contain max-h-[220px] sm:max-h-[260px] w-auto transition-transform duration-500 group-hover:scale-105"
                unoptimized
              />
            </div>

            <div className="flex flex-col justify-center px-6 pb-8 sm:px-8 sm:py-10 sm:max-w-[340px]">
              <p className="text-[11px] tracking-[0.28em] uppercase text-gold mb-2">
                {FEATURED.subtitle}
              </p>
              <h2 className="font-playfair text-2xl md:text-[1.75rem] leading-tight text-wf-black mb-3">
                {FEATURED.title}
              </h2>
              <p className="text-sm text-wf-gray leading-relaxed mb-6">
                {FEATURED.description}
              </p>
              <span className="inline-flex self-start items-center justify-center border border-wf-black/80 bg-white/60 px-6 py-2.5 text-[11px] tracking-[0.18em] uppercase text-wf-black transition-colors group-hover:border-gold group-hover:text-gold">
                Shop Now
              </span>
            </div>
          </Link>

          {/* Collection cards */}
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {COLLECTIONS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group flex flex-col overflow-hidden rounded-xl bg-wf-light hover:bg-white transition-colors duration-300 min-h-[220px] sm:min-h-[280px] md:min-h-[300px]"
              >
                <p className="px-3 pt-4 pb-2 text-[10px] sm:text-[11px] tracking-[0.22em] uppercase text-wf-black text-center font-medium truncate">
                  {item.label}
                </p>
                <div className="relative flex-1 flex items-center justify-center px-3 pb-4">
                  <Image
                    src={item.image}
                    alt={item.alt}
                    width={160}
                    height={160}
                    className="object-contain max-h-[120px] sm:max-h-[160px] md:max-h-[180px] w-auto transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
