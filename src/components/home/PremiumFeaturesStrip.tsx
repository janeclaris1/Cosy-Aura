"use client";

import Link from "next/link";
import { useT } from "@/lib/locale-store";

type StripLink =
  | { href: string; labelKey: string }
  | { href: string; label: string };

const LINKS: StripLink[] = [
  { href: "/gift-finder", labelKey: "home.premium.finder" },
  { href: "/atelier", labelKey: "home.premium.atelier" },
  { href: "/subscribe", labelKey: "home.premium.subscribe" },
  { href: "/compare", labelKey: "home.premium.compare" },
  { href: "/scent-journal", label: "Scent Journal" },
  { href: "/occasions", label: "Occasions" },
];

export function PremiumFeaturesStrip() {
  const t = useT();

  return (
    <section className="border-y border-wf-border bg-ivory">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 justify-center md:justify-between">
        <p className="font-cormorant text-xs uppercase tracking-[0.18em] text-wf-gray">
          Premium experiences
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 justify-center">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-cormorant text-[15px] tracking-[0.04em] text-espresso hover:text-gold transition-colors"
            >
              {"labelKey" in l ? t(l.labelKey) : l.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
