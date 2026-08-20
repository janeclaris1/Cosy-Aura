import Link from "next/link";

const BRANDS = [
  { name: "Chanel", slug: "chanel" },
  { name: "Dior", slug: "dior" },
  { name: "Tom Ford", slug: "tom-ford" },
  { name: "Creed", slug: "creed" },
  { name: "Byredo", slug: "byredo" },
  { name: "Maison Francis Kurkdjian", slug: "maison-francis-kurkdjian" },
  { name: "Hermès", slug: "hermes" },
  { name: "Le Labo", slug: "le-labo" },
  { name: "Jo Malone", slug: "jo-malone" },
  { name: "Yves Saint Laurent", slug: "ysl" },
];

function BrandLogo({
  brand,
  duplicate,
}: {
  brand: (typeof BRANDS)[number];
  duplicate?: boolean;
}) {
  return (
    <Link
      href={`/fragrances/${brand.slug}`}
      className="shrink-0 opacity-80 hover:opacity-100 transition-opacity duration-300 px-6"
      aria-label={brand.name}
      tabIndex={duplicate ? -1 : undefined}
      aria-hidden={duplicate || undefined}
    >
      <span className="font-playfair text-lg md:text-xl text-wf-black whitespace-nowrap">
        {brand.name}
      </span>
    </Link>
  );
}

export function BrandStrip() {
  return (
    <section className="py-10 border-b border-wf-border overflow-hidden bg-ivory">
      <div className="w-full overflow-hidden">
        <div className="brand-marquee">
          {BRANDS.map((brand) => (
            <BrandLogo key={brand.slug} brand={brand} />
          ))}
          {BRANDS.map((brand) => (
            <BrandLogo key={`dup-${brand.slug}`} brand={brand} duplicate />
          ))}
        </div>
      </div>
    </section>
  );
}
