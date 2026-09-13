import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";

export function AccountOrderHistoryButton({ orderCount }: { orderCount: number }) {
  const label =
    orderCount === 0
      ? "Order history"
      : orderCount === 1
        ? "Order history · 1 order"
        : `Order history · ${orderCount} orders`;

  return (
    <Link
      href="/account/orders"
      className="group flex w-full items-center gap-4 border border-wf-border/80 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(3,4,94,0.05)] hover:border-[#03045e]/25 hover:bg-[#fafaf9] transition-colors"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#03045e]/5 text-[#03045e] ring-1 ring-[#03045e]/10">
        <Package className="h-5 w-5" strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block font-playfair text-lg text-[#03045e] leading-tight">
          {label}
        </span>
        <span className="mt-0.5 block text-xs font-roboto text-wf-gray">
          {orderCount === 0
            ? "View past purchases and track deliveries"
            : "View all previous orders, status and tracking"}
        </span>
      </span>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-wf-gray transition-transform group-hover:translate-x-0.5 group-hover:text-[#03045e]"
        strokeWidth={1.75}
      />
    </Link>
  );
}
