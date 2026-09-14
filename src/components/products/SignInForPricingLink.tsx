"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/locale-store";

export function SignInForPricingLink({ className }: { className?: string }) {
  const pathname = usePathname();
  const t = useT();
  const callback = pathname && pathname !== "/" ? pathname : "/watches";

  return (
    <Link
      href={`/account/login?callbackUrl=${encodeURIComponent(callback)}`}
      className={className}
    >
      {t("product.signInForPricing")}
    </Link>
  );
}
