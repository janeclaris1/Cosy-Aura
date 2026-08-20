"use client";

import Link from "next/link";
import { Layers } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { useLocaleStore } from "@/lib/locale-store";
import { formatPrice, cn } from "@/lib/utils";
import Image from "next/image";

export type LayerCandidate = {
  id: string;
  slug: string;
  model: string;
  price: number;
  fragranceFamily?: string;
  brand: { name: string };
  images: { url: string; alt: string | null }[];
};

interface ScentLayeringGuideProps {
  base: LayerCandidate;
  partners: LayerCandidate[];
  className?: string;
}

const PAIRING_TIPS: Record<string, string> = {
  FLORAL: "Pair florals with woody or citrus accents for lift.",
  ORIENTAL: "Layer over fresh or citrus bases to keep evenings wearable.",
  WOODY: "Add floral or spicy hearts for richer evening trails.",
  FRESH: "Anchor with oriental or woody depth after midday.",
  CITRUS: "Bright tops love soft florals and clean musks.",
  SPICY: "Balance heat with fresh or citrus counterpoints.",
};

export function ScentLayeringGuide({
  base,
  partners,
  className,
}: ScentLayeringGuideProps) {
  const addItem = useCartStore((s) => s.addItem);
  const currency = useLocaleStore((s) => s.currency);
  useLocaleStore((s) => s.rates);
  const combos = partners.slice(0, 3);

  if (!combos.length) return null;

  function addCombo(partner: LayerCandidate) {
    const baseImg = base.images[0]?.url || "";
    const partnerImg = partner.images[0]?.url || "";
    addItem({
      fragranceId: base.id,
      slug: base.slug,
      brand: base.brand.name,
      model: base.model,
      price: base.price,
      image: baseImg,
    });
    addItem({
      fragranceId: partner.id,
      slug: partner.slug,
      brand: partner.brand.name,
      model: partner.model,
      price: partner.price,
      image: partnerImg,
    });
  }

  return (
    <div className={cn("rounded-lg border border-wf-border bg-surface p-5", className)}>
      <div className="flex items-center gap-2 mb-1">
        <Layers className="w-4 h-4 text-secondary" />
        <h3 className="font-playfair text-xl">Scent Layering Guide</h3>
      </div>
      <p className="text-sm text-mocha mb-5">
        {PAIRING_TIPS[base.fragranceFamily || ""] ||
          "Combine complementary families for a custom trail."}
      </p>

      <div className="space-y-4">
        {combos.map((partner, i) => (
          <div
            key={partner.id}
            className="rounded-lg border border-wf-border bg-ivory/60 p-4"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-mocha mb-3">
              Suggested combo {i + 1}
            </p>

            {/* Visual stack */}
            <div className="flex items-end gap-0 mb-4 pl-2">
              {[base, partner].map((f, idx) => (
                <div
                  key={f.id}
                  className={cn(
                    "relative w-16 h-16 rounded-full border-2 border-surface overflow-hidden bg-white shadow-sm",
                    idx > 0 && "-ml-4"
                  )}
                  style={{ zIndex: idx + 1 }}
                >
                  <Image
                    src={f.images[0]?.url || "/images/placeholders/fragrance.svg"}
                    alt={f.model}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
              ))}
              <div className="ml-3 min-w-0">
                <p className="text-sm font-medium text-espresso truncate">
                  {base.model}{" "}
                  <span className="text-mocha font-normal">+</span> {partner.model}
                </p>
                <p className="text-xs text-mocha">
                  {base.brand.name} · {partner.brand.name}
                </p>
                <p className="font-playfair text-highlight mt-0.5">
                  {formatPrice(base.price + partner.price, currency)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addCombo(partner)}
                className="btn-gold text-sm py-2.5 inline-flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                Try This Combo
              </button>
              <Link
                href={`/fragrances/${partner.slug}`}
                className="btn-outline text-sm py-2.5"
              >
                View {partner.brand.name}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
