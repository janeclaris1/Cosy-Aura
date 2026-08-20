"use client";

import { useSession } from "next-auth/react";
import { applyMemberDiscount, MEMBER_DISCOUNT_PERCENT } from "@/lib/pricing";

/** Whether the signed-in customer gets the permanent member discount. */
export function useMemberDiscount(): {
  active: boolean;
  percent: number;
  apply: (price: number) => number;
} {
  const { data: session } = useSession();
  const active = Boolean(session?.user?.memberDiscount);

  return {
    active,
    percent: MEMBER_DISCOUNT_PERCENT,
    apply: (price: number) => (active ? applyMemberDiscount(price) : price),
  };
}
