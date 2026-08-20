import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const PANELS = [
  {
    title: "Buy with Confidence",
    body: "We curate brand-new luxury fragrances from trusted channels - verified, ready to ship after payment.",
    href: "/fragrances",
    image: "/images/lifestyle/buy-with-confidence.png",
    imageAlt: "Cosy Aura perfume held in studio light",
  },
  {
    title: "Request a Fragrance",
    body: "Looking for a specific scent? Tell us what you want and our team will help you source it.",
    href: "/contact?subject=Request%20a%20Fragrance",
    image: "/images/lifestyle/request-a-fragrance.png",
    imageAlt: "Evening portrait with a Cosy Aura bottle",
  },
];

export function FeatureCtaPanels() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
      {PANELS.map((panel) => (
        <Link
          key={panel.href}
          href={panel.href}
          className="group grid grid-cols-2 bg-ivory overflow-hidden min-h-[180px] md:min-h-[220px]"
        >
          <div className="relative bg-ivory overflow-hidden">
            <Image
              src={panel.image}
              alt={panel.imageAlt}
              fill
              className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          </div>

          <div className="relative flex flex-col justify-center px-4 py-5 sm:px-6 sm:py-6 pr-10 sm:pr-12">
            <h3 className="font-playfair text-[15px] sm:text-base tracking-[0.08em] uppercase text-wf-black mb-2 leading-snug">
              {panel.title}
            </h3>
            <p className="text-xs sm:text-[13px] text-wf-gray leading-relaxed">
              {panel.body}
            </p>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-wf-gray group-hover:text-espresso group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>
      ))}
    </div>
  );
}
