"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/locale-store";
import { useTranslatedNotes } from "@/components/locale/TranslatedText";

type TierKey = "top" | "heart" | "base";

const NOTE_BLURBS: Record<string, string> = {
  citrus: "Bright opening sparkle that lifts the first impression.",
  floral: "Blooming heart that shapes the perfume's character.",
  woody: "Grounding warmth that lingers on skin and fabric.",
  oriental: "Resinous depth with sensual evening presence.",
  spicy: "Aromatic heat that adds intrigue and projection.",
  fresh: "Airy clarity for clean, effortless wear.",
};

function blurbFor(note: string, tier: TierKey) {
  const n = note.toLowerCase();
  if (/(bergamot|lemon|orange|citrus|neroli|mandarin|grapefruit|lime|citron)/.test(n))
    return NOTE_BLURBS.citrus;
  if (/(rose|jasmine|orchid|tuberose|lily|floral|blossom|peony|geranium|ylang|freesia)/.test(n))
    return NOTE_BLURBS.floral;
  if (/(oud|sandalwood|cedar|vetiver|patchouli|wood|oakmoss|moss)/.test(n))
    return NOTE_BLURBS.woody;
  if (/(vanilla|amber|benzoin|incense|oriental|tonka)/.test(n))
    return NOTE_BLURBS.oriental;
  if (/(pepper|saffron|cardamom|cinnamon|spice|clove|cumin)/.test(n))
    return NOTE_BLURBS.spicy;
  if (/(musk|ozonic|aquatic|fresh|green|mint)/.test(n)) return NOTE_BLURBS.fresh;
  if (tier === "top") return "First impression - bright and fleeting.";
  if (tier === "heart") return "The soul of the scent as it unfolds.";
  return "Lasting trail that anchors the composition.";
}

const TIER_META: {
  key: TierKey;
  sideKey: string;
  labelKey: string;
  image: string;
  imageAlt: string;
  imageClass: string;
}[] = [
  {
    key: "top",
    sideKey: "pdp.firstImpression",
    labelKey: "pdp.topNotes",
    image: "/images/scent-pyramid/tier-top.jpg",
    imageAlt: "Citrus, berries and lavender top notes",
    imageClass: "flex-[1.15]",
  },
  {
    key: "heart",
    sideKey: "pdp.heartOfFragrance",
    labelKey: "pdp.heartNotes",
    image: "/images/scent-pyramid/tier-heart.jpg",
    imageAlt: "Floral and aromatic heart notes",
    imageClass: "flex-1",
  },
  {
    key: "base",
    sideKey: "pdp.longLasting",
    labelKey: "pdp.baseNotes",
    image: "/images/scent-pyramid/tier-base.jpg",
    imageAlt: "Wood, vanilla and moss base notes",
    imageClass: "flex-[1.2]",
  },
];

interface ScentPyramidProps {
  topNotes?: string[];
  heartNotes?: string[];
  baseNotes?: string[];
  className?: string;
}

export function ScentPyramid({
  topNotes = [],
  heartNotes = [],
  baseNotes = [],
  className,
}: ScentPyramidProps) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState<{ note: string; text: string } | null>(null);
  const translatedTop = useTranslatedNotes(topNotes);
  const translatedHeart = useTranslatedNotes(heartNotes);
  const translatedBase = useTranslatedNotes(baseNotes);

  const notesByTier: Record<TierKey, string[]> = {
    top: translatedTop,
    heart: translatedHeart,
    base: translatedBase,
  };

  const sourceByTier: Record<TierKey, string[]> = {
    top: topNotes,
    heart: heartNotes,
    base: baseNotes,
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!topNotes.length && !heartNotes.length && !baseNotes.length) {
    return null;
  }

  return (
    <section className={cn("bg-[#ededed] px-4 py-8 sm:px-6", className)}>
      <h3 className="mb-6 text-center font-playfair text-xl sm:text-left">
        {t("pdp.pyramid")}
      </h3>

      <div
        className={cn(
          "mx-auto grid max-w-5xl grid-cols-1 gap-6 transition-all duration-700 ease-organic lg:grid-cols-[minmax(0,1fr)_minmax(16rem,28rem)_minmax(0,1fr)] lg:grid-rows-[1.15fr_1.85rem_1fr_1.85rem_1.2fr_1.85rem] lg:items-stretch lg:gap-x-6 lg:gap-y-0",
          visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        )}
      >
        <SideLabel className="lg:col-start-1 lg:row-start-1">
          {t(TIER_META[0].sideKey)}
        </SideLabel>
        <SideLabel className="lg:col-start-1 lg:row-start-3">
          {t(TIER_META[1].sideKey)}
        </SideLabel>
        <SideLabel className="lg:col-start-1 lg:row-start-5">
          {t(TIER_META[2].sideKey)}
        </SideLabel>

        <div className="lg:col-start-2 lg:row-span-6 lg:row-start-1">
          <div
            className="overflow-hidden bg-white"
            style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
          >
            <div className="flex aspect-[1/0.9] flex-col">
              {TIER_META.map((tier) => (
                <TierBand key={tier.key} tier={tier} label={t(tier.labelKey)} />
              ))}
            </div>
          </div>
        </div>

        {TIER_META.map((tier, index) => (
          <NoteList
            key={tier.key}
            tier={tier.key}
            notes={notesByTier[tier.key]}
            sourceNotes={sourceByTier[tier.key]}
            onHover={setHover}
            className={cn(
              "hidden lg:flex",
              index === 0 && "lg:col-start-3 lg:row-start-1",
              index === 1 && "lg:col-start-3 lg:row-start-3",
              index === 2 && "lg:col-start-3 lg:row-start-5"
            )}
          />
        ))}
      </div>

      <div className="mx-auto mt-8 grid max-w-5xl gap-6 sm:grid-cols-3 lg:hidden">
        {TIER_META.map((tier) => (
          <div key={`mobile-${tier.key}`}>
            <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              {t(tier.sideKey)}
            </p>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-espresso">
              {t(tier.labelKey)}
            </p>
            <NoteList
              tier={tier.key}
              notes={notesByTier[tier.key]}
              sourceNotes={sourceByTier[tier.key]}
              onHover={setHover}
            />
          </div>
        ))}
      </div>

      <div className="mx-auto mt-6 min-h-[2.75rem] max-w-5xl text-center text-sm text-mocha lg:text-left">
        {hover ? (
          <>
            <span className="font-medium text-espresso">{hover.note}: </span>
            {hover.text}
          </>
        ) : (
          <span className="text-mocha/70">{t("pdp.pyramidHint")}</span>
        )}
      </div>
    </section>
  );
}

function TierBand({
  tier,
  label,
}: {
  tier: (typeof TIER_META)[number];
  label: string;
}) {
  return (
    <>
      <div className={cn("relative min-h-0 overflow-hidden", tier.imageClass)}>
        <img
          src={tier.image}
          alt={tier.imageAlt}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex h-[1.85rem] shrink-0 items-center justify-center bg-white text-[10px] font-semibold uppercase tracking-[0.22em] text-espresso sm:text-[11px]">
        {label}
      </div>
    </>
  );
}

function SideLabel({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "hidden items-center justify-end text-right text-[10px] font-medium uppercase leading-relaxed tracking-[0.18em] text-neutral-500 lg:flex",
        className
      )}
    >
      {children}
    </p>
  );
}

function NoteList({
  tier,
  notes,
  sourceNotes,
  onHover,
  className,
}: {
  tier: TierKey;
  notes: string[];
  sourceNotes: string[];
  onHover: (next: { note: string; text: string } | null) => void;
  className?: string;
}) {
  if (!notes.length) {
    return <p className={cn("items-center text-xs text-mocha/60", className)}>-</p>;
  }

  return (
    <ul
      className={cn(
        "flex flex-col justify-center gap-1 text-[11px] font-medium uppercase tracking-[0.14em] text-espresso",
        className
      )}
    >
      {notes.map((note, i) => {
        const source = sourceNotes[i] || note;
        return (
          <li key={`${tier}-${source}`}>
            <button
              type="button"
              className="text-left transition-colors duration-organic ease-organic hover:text-[#a67c52]"
              onMouseEnter={() => onHover({ note, text: blurbFor(source, tier) })}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover({ note, text: blurbFor(source, tier) })}
              onBlur={() => onHover(null)}
            >
              {note}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
