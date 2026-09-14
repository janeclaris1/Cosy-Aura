"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { useT } from "@/lib/locale-store";
import { cn } from "@/lib/utils";

type SignInForPricingVariant = "card" | "detail" | "button" | "compact" | "inline";

export function SignInForPricingLink({
  className,
  variant = "inline",
}: {
  className?: string;
  variant?: SignInForPricingVariant;
}) {
  const pathname = usePathname();
  const t = useT();
  const callback = pathname && pathname !== "/" ? pathname : "/watches";
  const href = `/account/login?callbackUrl=${encodeURIComponent(callback)}`;

  if (variant === "card") {
    return (
      <Link
        href={href}
        className={cn(
          "mt-2.5 inline-flex max-w-full items-center gap-2 rounded-full border border-[#03045e]/12 bg-[#f7f6f3] px-3 py-2 transition-colors hover:border-[#03045e]/25 hover:bg-[#03045e]/5",
          className
        )}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#03045e]/8">
          <Lock className="h-3 w-3 text-[#03045e]" strokeWidth={2.25} aria-hidden />
        </span>
        <span className="text-[11px] font-semibold text-[#03045e]">
          {t("product.signInForPricing")}
        </span>
      </Link>
    );
  }

  if (variant === "detail") {
    return (
      <div className={cn("mb-6", className)}>
        <div className="inline-flex items-start gap-3 rounded-2xl border border-stone-200/90 bg-[#f7f6f3] px-4 py-3.5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-stone-200/80">
            <Lock className="h-4 w-4 text-[#03045e]" strokeWidth={2.25} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="max-w-sm text-sm leading-relaxed text-wf-gray">
              {t("product.signInForPricingDetail")}
            </p>
            <Link
              href={href}
              className="mt-3 inline-flex items-center rounded-full bg-[#03045e] px-5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#020338]"
            >
              {t("product.signInForPricing")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "button") {
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full bg-[#03045e] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#020338]",
          className
        )}
      >
        <Lock className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
        {t("product.signInForPricing")}
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium text-[#03045e] transition-colors hover:text-[#020338]",
          className
        )}
      >
        <Lock className="h-3 w-3 shrink-0 opacity-70" strokeWidth={2.25} aria-hidden />
        <span>{t("product.priceHiddenGuest")}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-[#03045e] transition-colors hover:text-[#020338]",
        className
      )}
    >
      <Lock className="h-3.5 w-3.5 opacity-70" strokeWidth={2.25} aria-hidden />
      {t("product.signInForPricing")}
    </Link>
  );
}
