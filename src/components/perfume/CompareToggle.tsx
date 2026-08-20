"use client";

import { GitCompareArrows } from "lucide-react";
import { usePremiumStore, type CompareItem } from "@/lib/premium-store";
import { cn } from "@/lib/utils";

export function CompareToggle({
  item,
  className,
}: {
  item: CompareItem;
  className?: string;
}) {
  const toggleCompare = usePremiumStore((s) => s.toggleCompare);
  const isComparing = usePremiumStore((s) => s.isComparing(item.id));

  return (
    <button
      type="button"
      onClick={() => toggleCompare(item)}
      className={cn(
        "inline-flex items-center gap-2 text-sm border px-3 py-2 transition-colors duration-organic ease-organic",
        isComparing
          ? "border-gold bg-highlight/15 text-espresso"
          : "border-wf-border hover:border-gold",
        className
      )}
    >
      <GitCompareArrows className="w-4 h-4" />
      {isComparing ? "In compare" : "Compare"}
    </button>
  );
}
