import Image from "next/image";
import Link from "next/link";

const CATEGORIES = [
  {
    title: "Floral",
    href: "/fragrances?fragranceFamily=FLORAL",
    image: "/images/fragrances/new/oil-gucci-flora.png",
  },
  {
    title: "Woody",
    href: "/fragrances?fragranceFamily=WOODY",
    image: "/images/fragrances/new/oil-santal-33.png",
  },
  {
    title: "Fresh",
    href: "/fragrances?fragranceFamily=FRESH",
    image: "/images/fragrances/new/oil-sauvage.png",
  },
];

export function FeaturedCategories() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-playfair text-3xl text-center mb-10">Shop by Category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.title}
              href={cat.href}
              className="group relative aspect-[3/2] overflow-hidden bg-accent"
            >
              <Image
                src={cat.image}
                alt={cat.title}
                fill
                className="object-contain transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-primary/35 group-hover:bg-primary/50 transition-colors" />
              <div className="absolute inset-0 flex items-center justify-center">
                <h3 className="font-playfair text-xl text-white tracking-wide">{cat.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
