"use client";

import { useMemo, useState } from "react";
import { allIngredientOrigins, originsForNotes } from "@/lib/scent-intelligence";
import { cn } from "@/lib/utils";

interface IngredientsMapProps {
  notes?: string[];
  className?: string;
  compact?: boolean;
}

/** Stylized world map of rare ingredient origins (SVG projection) */
export function IngredientsMap({
  notes = [],
  className,
  compact = false,
}: IngredientsMapProps) {
  const all = allIngredientOrigins();
  const highlighted = useMemo(() => originsForNotes(notes), [notes]);
  const [active, setActive] = useState(highlighted[0]?.note || all[0].note);
  const selected = all.find((o) => o.note === active) || all[0];

  const pins = compact && highlighted.length ? highlighted : all;

  return (
    <div className={cn("border border-wf-border bg-white", className)}>
      <div className={cn("p-4 md:p-6", compact && "p-4")}>
        <p className="text-xs uppercase tracking-[0.14em] text-gold mb-1">
          Ingredients Map
        </p>
        <h3 className="font-playfair text-2xl mb-2">
          {compact ? "Where this scent travels from" : "Origins of rare ingredients"}
        </h3>
        <p className="text-sm text-wf-gray mb-5 max-w-2xl">
          Trace the geography behind iconic notes - from Grasse roses to Madagascan vanilla.
        </p>

        <div className="grid md:grid-cols-[1.4fr_1fr] gap-6 items-start">
          <div className="relative aspect-[2/1] bg-gradient-to-br from-ivory via-secondary/20 to-primary/10 overflow-hidden rounded-lg border border-wf-border">
            <svg viewBox="0 0 800 400" className="absolute inset-0 h-full w-full">
              <rect width="800" height="400" fill="transparent" />
              {/* Simplified continents silhouette */}
              <path
                d="M120 80c40-20 90-10 120 20 30 28 20 70-10 90-40 25-90 10-110-20-25-35-20-70 0-90zm180 40c50-30 120-20 150 25 20 30 10 80-30 100-55 28-130 5-150-40-15-35 0-65 30-85zm220 20c45-15 100 0 120 40 25 50-10 100-55 110-60 12-110-30-100-80 5-30 20-55 35-70zm-280 120c35-10 80 5 95 40 20 45-15 85-55 90-50 5-85-35-75-75 5-25 20-45 35-55zm200 30c40-5 85 20 90 55 8 45-35 75-75 70-50-5-80-45-60-85 10-25 30-35 45-40z"
                fill="rgba(45,27,61,0.08)"
              />
              {pins.map((pin) => {
                const x = ((pin.lng + 180) / 360) * 800;
                const y = ((90 - pin.lat) / 180) * 400;
                const on = pin.note === active;
                const isNote = highlighted.some((h) => h.note === pin.note);
                return (
                  <g
                    key={pin.note}
                    transform={`translate(${x},${y})`}
                    className="cursor-pointer"
                    onClick={() => setActive(pin.note)}
                  >
                    <circle
                      r={on ? 9 : 6}
                      fill={on ? "#03045e" : isNote ? "#03045e" : "#9a8b7a"}
                      opacity={0.95}
                    />
                    <circle r={on ? 16 : 0} fill="#d4af37" opacity={0.25} />
                  </g>
                );
              })}
            </svg>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-wf-gray mb-1">
              {selected.region}
            </p>
            <h4 className="font-playfair text-xl mb-2">{selected.note}</h4>
            <p className="text-sm text-wf-gray leading-relaxed mb-4">
              {selected.story}
            </p>
            <div className="flex flex-wrap gap-2">
              {pins.map((pin) => (
                <button
                  key={pin.note}
                  type="button"
                  onClick={() => setActive(pin.note)}
                  className={cn(
                    "px-2.5 py-1 text-xs border transition-colors",
                    pin.note === active
                      ? "border-gold bg-highlight/20"
                      : "border-wf-border hover:border-gold"
                  )}
                >
                  {pin.note}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
