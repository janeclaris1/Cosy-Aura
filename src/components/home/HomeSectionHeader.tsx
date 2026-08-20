"use client";

import Link from "next/link";
import { useT } from "@/lib/locale-store";

type TitleKey = "home.latest" | "home.featured" | "home.bestSellers";

export function HomeSectionHeader({
  titleKey,
  href = "/fragrances",
}: {
  titleKey: TitleKey;
  href?: string;
}) {
  const t = useT();

  return (
    <div className="flex items-center justify-between mb-10">
      <h2 className="font-playfair text-3xl">{t(titleKey)}</h2>
      <Link
        href={href}
        className="text-[11px] uppercase tracking-[0.16em] text-mocha hover:text-highlight transition-colors"
      >
        {t("home.viewAll")}
      </Link>
    </div>
  );
}
