"use client";

import { useEffect, useState } from "react";
import { useLocaleStore } from "@/lib/locale-store";
import type { UiLang } from "@/lib/geo-locale";

const cache = new Map<string, string>();

function cacheKey(text: string, lang: UiLang) {
  return `${lang}::${text}`;
}

async function fetchTranslation(text: string, target: UiLang): Promise<string> {
  if (!text.trim() || target === "en") return text;
  const key = cacheKey(text, target);
  const hit = cache.get(key);
  if (hit) return hit;

  try {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem(`ca_tr_${key}`)
        : null;
    if (stored) {
      cache.set(key, stored);
      return stored;
    }
  } catch {
    /* ignore */
  }

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, target }),
    });
    if (!res.ok) return text;
    const data = (await res.json()) as { text?: string };
    const out = data.text?.trim() || text;
    cache.set(key, out);
    try {
      window.localStorage.setItem(`ca_tr_${key}`, out);
    } catch {
      /* ignore quota */
    }
    return out;
  } catch {
    return text;
  }
}

/** Translates free-form catalog/CMS English into the active UI language. */
export function TranslatedText({
  text,
  as: Tag = "span",
  className,
}: {
  text: string;
  as?: "span" | "p" | "div";
  className?: string;
}) {
  const language = useLocaleStore((s) => s.language);
  const [value, setValue] = useState(text);

  useEffect(() => {
    let cancelled = false;
    if (language === "en" || !text) {
      setValue(text);
      return;
    }
    fetchTranslation(text, language).then((next) => {
      if (!cancelled) setValue(next);
    });
    return () => {
      cancelled = true;
    };
  }, [text, language]);

  return <Tag className={className}>{value}</Tag>;
}

export function useTranslatedNotes(notes: string[]): string[] {
  const language = useLocaleStore((s) => s.language);
  const [translated, setTranslated] = useState(notes);

  useEffect(() => {
    let cancelled = false;
    if (language === "en" || !notes.length) {
      setTranslated(notes);
      return;
    }
    Promise.all(notes.map((n) => fetchTranslation(n, language))).then((next) => {
      if (!cancelled) setTranslated(next);
    });
    return () => {
      cancelled = true;
    };
  }, [notes.join("|"), language]);

  return translated;
}
