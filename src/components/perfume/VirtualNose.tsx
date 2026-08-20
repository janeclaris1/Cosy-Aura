"use client";

import { describeScent } from "@/lib/scent-intelligence";
import { cn } from "@/lib/utils";

interface VirtualNoseProps {
  model: string;
  brand: string;
  fragranceFamily: string;
  concentration: string;
  sillage: string;
  longevity?: string | null;
  topNotes?: string[];
  heartNotes?: string[];
  baseNotes?: string[];
  className?: string;
}

export function VirtualNose(props: VirtualNoseProps) {
  const reading = describeScent(props);

  return (
    <div className={cn("border border-wf-border bg-primary text-ivory p-5 md:p-6", props.className)}>
      <p className="text-xs uppercase tracking-[0.14em] text-highlight mb-3">
        Virtual Nose
      </p>
      <h3 className="font-playfair text-2xl mb-4">{reading.headline}</h3>
      <div className="space-y-3 text-sm text-ivory/85 leading-relaxed">
        {reading.paragraphs.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mt-5">
        {reading.tags.map((tag) => (
          <span
            key={tag}
            className="px-2.5 py-1 text-[11px] uppercase tracking-wider border border-highlight/40 text-highlight"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
