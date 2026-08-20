"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  POPULAR_CURRENCIES,
  UI_LANGUAGES,
} from "@/lib/geo-locale";
import { useLocaleStore, useT } from "@/lib/locale-store";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const language = useLocaleStore((s) => s.language);
  const currency = useLocaleStore((s) => s.currency);
  const setLanguage = useLocaleStore((s) => s.setLanguage);
  const setCurrency = useLocaleStore((s) => s.setCurrency);
  const [open, setOpen] = useState<"lang" | "cur" | null>(null);

  const currencies = useMemo(() => {
    const list = [...POPULAR_CURRENCIES];
    if (!list.includes(currency as (typeof POPULAR_CURRENCIES)[number])) {
      list.unshift(currency as (typeof POPULAR_CURRENCIES)[number]);
    }
    return Array.from(new Set(list));
  }, [currency]);

  const langMeta = UI_LANGUAGES.find((item) => item.code === language) || UI_LANGUAGES[0];

  return (
    <div className={cn("flex items-center gap-2", compact && "flex-wrap")}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(open === "lang" ? null : "lang")}
          className="inline-flex items-center gap-1 text-sm font-medium text-wf-gray hover:text-gold transition-colors"
          aria-label={t("locale.language")}
        >
          <span>{langMeta.code.toUpperCase()}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {open === "lang" && (
          <div className="absolute top-full right-0 mt-2 bg-white border border-wf-border shadow-lg rounded-lg py-1 z-50 min-w-[10rem]">
            {UI_LANGUAGES.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setLanguage(item.code);
                  setOpen(null);
                }}
                className={cn(
                  "block w-full px-4 py-2 text-sm text-left hover:bg-wf-light",
                  language === item.code && "text-gold font-medium"
                )}
              >
                {item.native}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="text-wf-border" aria-hidden>
        |
      </span>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(open === "cur" ? null : "cur")}
          className="inline-flex items-center gap-1 text-sm font-medium text-wf-gray hover:text-gold transition-colors"
          aria-label={t("locale.currency")}
        >
          <span>{currency}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {open === "cur" && (
          <div className="absolute top-full right-0 mt-2 bg-white border border-wf-border shadow-lg rounded-lg py-1 z-50 max-h-72 overflow-y-auto min-w-[7rem]">
            {currencies.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setCurrency(code);
                  setOpen(null);
                }}
                className={cn(
                  "block w-full px-4 py-2 text-sm text-left hover:bg-wf-light",
                  currency === code && "text-gold font-medium"
                )}
              >
                {code}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
