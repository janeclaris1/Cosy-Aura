"use client";

import { Leaf, Heart, Recycle, PawPrint, Sprout, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SustainabilityFlags = {
  sustainabilityScore?: number | null;
  isVegan?: boolean;
  isCrueltyFree?: boolean;
  naturalIngredients?: boolean;
  sustainablePackaging?: boolean;
  carbonNeutral?: boolean;
  ethicalSourcing?: boolean;
};

const BADGES = [
  {
    key: "naturalIngredients",
    label: "Natural Ingredients",
    icon: Sprout,
    flag: (f: SustainabilityFlags) =>
      f.naturalIngredients ?? (f.sustainabilityScore ?? 0) >= 4,
  },
  {
    key: "sustainablePackaging",
    label: "Sustainable Packaging",
    icon: Recycle,
    flag: (f: SustainabilityFlags) =>
      f.sustainablePackaging ?? (f.sustainabilityScore ?? 0) >= 3,
  },
  {
    key: "isCrueltyFree",
    label: "Cruelty-Free",
    icon: PawPrint,
    flag: (f: SustainabilityFlags) => f.isCrueltyFree ?? true,
  },
  {
    key: "carbonNeutral",
    label: "Carbon Neutral",
    icon: Globe2,
    flag: (f: SustainabilityFlags) =>
      f.carbonNeutral ?? (f.sustainabilityScore ?? 0) >= 5,
  },
  {
    key: "isVegan",
    label: "Vegan",
    icon: Leaf,
    flag: (f: SustainabilityFlags) => f.isVegan ?? false,
  },
  {
    key: "ethicalSourcing",
    label: "Ethical Sourcing",
    icon: Heart,
    flag: (f: SustainabilityFlags) =>
      f.ethicalSourcing ?? (f.sustainabilityScore ?? 0) >= 4,
  },
] as const;

function scoreTone(score: number) {
  if (score >= 5) return "bg-success/20 text-espresso border-success/50";
  if (score >= 4) return "bg-highlight-light/60 text-espresso border-highlight/40";
  if (score >= 3) return "bg-secondary-light text-espresso border-secondary/50";
  return "bg-accent text-mocha border-wf-border";
}

interface SustainabilityBadgeProps {
  flags: SustainabilityFlags;
  compact?: boolean;
  className?: string;
}

export function SustainabilityBadge({
  flags,
  compact = false,
  className,
}: SustainabilityBadgeProps) {
  const score = Math.min(5, Math.max(1, flags.sustainabilityScore ?? 3));
  const active = BADGES.filter((b) => b.flag(flags));

  if (!active.length && compact) return null;

  if (compact) {
    return (
      <div className={cn("flex flex-wrap items-center justify-center gap-1", className)}>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border",
            scoreTone(score)
          )}
          title={`Sustainability ${score}/5`}
        >
          <Leaf className="w-3 h-3" />
          {score}/5
        </span>
        {active.slice(0, 2).map((b) => (
          <span
            key={b.key}
            className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border border-wf-border bg-surface text-mocha"
          >
            <b.icon className="w-3 h-3 text-primary" />
            {b.label.split(" ")[0]}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-wf-border bg-surface p-5", className)}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-playfair text-xl">Sustainability</h3>
        <span
          className={cn(
            "text-xs font-semibold px-2.5 py-1 rounded-full border",
            scoreTone(score)
          )}
        >
          Score {score}/5
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {BADGES.map((b) => {
          const on = b.flag(flags);
          return (
            <div
              key={b.key}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition-colors duration-organic ease-organic",
                on
                  ? scoreTone(score)
                  : "bg-ivory/50 border-wf-border text-mocha/50"
              )}
            >
              <b.icon className={cn("w-3.5 h-3.5 shrink-0", on ? "text-primary" : "")} />
              <span className="leading-tight">{b.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
