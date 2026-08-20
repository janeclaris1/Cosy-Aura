"use client";

import Link from "next/link";
import { GitCompareArrows, X } from "lucide-react";
import { usePremiumStore } from "@/lib/premium-store";
import { useT } from "@/lib/locale-store";
import { cn } from "@/lib/utils";

export function CompareTray() {
  const t = useT();
  const compare = usePremiumStore((s) => s.compare);
  const removeCompare = usePremiumStore((s) => s.removeCompare);
  const clearCompare = usePremiumStore((s) => s.clearCompare);

  if (compare.length === 0) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-wf-border bg-white/95 backdrop-blur-md shadow-[0_-8px_30px_rgba(45,27,61,0.12)] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 text-sm">
          <GitCompareArrows className="w-4 h-4 text-gold" />
          <span className="font-medium">
            {t("compare.tray", { n: compare.length })}
          </span>
          <div className="hidden sm:flex gap-2 ml-2">
            {compare.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 px-2 py-1 bg-wf-light text-xs"
              >
                {c.brand} {c.model}
                <button
                  type="button"
                  aria-label={`Remove ${c.model}`}
                  onClick={() => removeCompare(c.id)}
                  className="inline-flex items-center justify-center min-h-8 min-w-8 hover:text-red-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={clearCompare} className="btn-outline !py-2 !px-3 text-xs">
            {t("compare.clear")}
          </button>
          <Link
            href="/compare"
            className={cn(
              "btn-gold !py-2 !px-4 text-xs",
              compare.length < 2 && "pointer-events-none opacity-50"
            )}
          >
            {t("compare.open")}
          </Link>
        </div>
      </div>
    </div>
  );
}
