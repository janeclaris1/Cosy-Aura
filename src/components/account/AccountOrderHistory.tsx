import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { orderStatusLabel } from "@/lib/order-tracking";
import { formatOrderBookTotal } from "@/lib/order-money";
import { cn } from "@/lib/utils";

export type AccountOrderRow = {
  id: string;
  ref: string;
  receiptNumber: string | null;
  status: string;
  channel: string;
  createdAt: string;
  totalLabel: string;
  productSummary: string;
  itemCount: number;
  trackHref: string;
};

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-sky-50 text-sky-900 ring-sky-200/70",
  PARTIALLY_PAID: "bg-amber-50 text-amber-900 ring-amber-200/70",
  PROCESSING: "bg-indigo-50 text-indigo-900 ring-indigo-200/70",
  SHIPPED: "bg-violet-50 text-violet-900 ring-violet-200/70",
  DELIVERED: "bg-emerald-50 text-emerald-900 ring-emerald-200/70",
  CANCELLED: "bg-stone-100 text-stone-600 ring-stone-200/80",
  REFUNDED: "bg-stone-50 text-stone-500 ring-stone-200/70",
};

function formatOrderDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ring-1 font-roboto",
        STATUS_STYLES[status] || "bg-stone-50 text-stone-600 ring-stone-200/70"
      )}
    >
      {orderStatusLabel(status)}
    </span>
  );
}

export function AccountOrderHistory({
  orders,
  customerEmail,
}: {
  orders: AccountOrderRow[];
  customerEmail: string;
}) {
  if (orders.length === 0) {
    return (
      <section className="border border-wf-border/80 bg-white shadow-[0_1px_3px_rgba(3,4,94,0.05)]">
        <header className="px-6 py-5 border-b border-wf-border/60">
          <p className="text-[10px] uppercase tracking-[0.2em] text-wf-gray font-roboto mb-1">
            Your purchases
          </p>
          <h2 className="font-playfair text-2xl text-[#03045e]">Order history</h2>
        </header>
        <div className="px-6 py-14 text-center">
          <p className="font-playfair text-lg text-[#03045e] mb-2">No orders yet</p>
          <div className="text-sm text-wf-gray font-roboto mb-6 max-w-sm mx-auto">
            When you place an order, it will appear here with tracking and status updates.
          </div>
          <Link
            href="/fragrances"
            className="inline-flex items-center gap-1.5 text-sm font-roboto text-[#03045e] border border-[#03045e]/20 px-5 py-2.5 hover:bg-[#03045e] hover:text-white transition-colors"
          >
            Explore fragrances
            <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="border border-wf-border/80 bg-white shadow-[0_1px_3px_rgba(3,4,94,0.05)]">
      <header className="px-6 py-5 border-b border-wf-border/60 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-wf-gray font-roboto mb-1">
            Your purchases
          </p>
          <h2 className="font-playfair text-2xl text-[#03045e]">Order history</h2>
        </div>
        <span className="text-xs text-wf-gray font-roboto tabular-nums">
          {orders.length} {orders.length === 1 ? "order" : "orders"}
        </span>
      </header>

      <ul className="divide-y divide-wf-border/50">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              href={order.trackHref}
              className="group block px-6 py-5 hover:bg-[#fafaf9] transition-colors"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
                    <span className="font-playfair text-lg text-[#03045e] tracking-tight">
                      {order.receiptNumber
                        ? order.receiptNumber
                        : `#${order.ref}`}
                    </span>
                    <OrderStatusBadge status={order.status} />
                    {order.channel === "POS" && (
                      <span className="text-[10px] uppercase tracking-[0.14em] text-wf-gray font-roboto">
                        In-store
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-wf-gray font-roboto mb-1.5">
                    {formatOrderDate(order.createdAt)}
                    {order.itemCount > 1 && (
                      <span className="text-wf-gray/70">
                        {" "}
                        · {order.itemCount} items
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-espresso/85 font-roboto leading-snug line-clamp-2">
                    {order.productSummary}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center sm:shrink-0 sm:min-w-[7.5rem]">
                  <p className="font-playfair text-xl text-[#03045e] tabular-nums">
                    {order.totalLabel}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-roboto text-[#03045e]/70 group-hover:text-[#03045e] transition-colors">
                    Track order
                    <ArrowUpRight
                      className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      strokeWidth={1.75}
                    />
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <footer className="px-6 py-4 border-t border-wf-border/50 bg-[#fafaf9]/50">
        <Link
          href={`/track?email=${encodeURIComponent(customerEmail)}`}
          className="text-xs font-roboto text-wf-gray hover:text-[#03045e] transition-colors"
        >
          Looking for an older order? Track by reference and email →
        </Link>
      </footer>
    </section>
  );
}

export function buildAccountOrderRows(
  orders: Array<{
    id: string;
    receiptNumber: string | null;
    status: string;
    channel: string;
    createdAt: Date;
    total: number;
    chargeAmount: number | null;
    chargeCurrency: string | null;
    shippingCost: number | null;
    posDiscountAmount: number | null;
    items: Array<{
      quantity: number;
      price: number;
      fragrance: { brand: { name: string }; model: string };
    }>;
  }>,
  customerEmail: string
): AccountOrderRow[] {
  return orders.map((order) => {
    const ref = order.id.slice(0, 8).toUpperCase();
    const names = order.items.map(
      (item) => `${item.fragrance.brand.name} ${item.fragrance.model}`
    );
    const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
    let productSummary = names.slice(0, 2).join(" · ");
    if (names.length > 2) {
      productSummary += ` · +${names.length - 2} more`;
    }

    return {
      id: order.id,
      ref,
      receiptNumber: order.receiptNumber,
      status: order.status,
      channel: order.channel,
      createdAt: order.createdAt.toISOString(),
      totalLabel: formatOrderBookTotal({
        total: order.total,
        chargeAmount: order.chargeAmount,
        chargeCurrency: order.chargeCurrency,
        shippingCost: order.shippingCost,
        posDiscountAmount: order.posDiscountAmount,
        items: order.items,
      }),
      productSummary,
      itemCount,
      trackHref: `/track?ref=${ref}&email=${encodeURIComponent(customerEmail)}`,
    };
  });
}
