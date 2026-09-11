import Link from "next/link";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import { StaffAvatar } from "@/components/admin/StaffAvatar";
import { AdminEmptyState } from "@/components/admin/admin-ui";
import { formatPrice } from "@/lib/utils";
import type { OrderChannel, OrderStatus } from "@prisma/client";

export type OrdersTableRow = {
  id: string;
  receiptNumber: string | null;
  channel: OrderChannel;
  email: string;
  shippingName: string | null;
  total: number;
  status: OrderStatus;
  createdAt: Date;
  fulfillmentBranch: { name: string; country: string } | null;
  posUser: { name: string | null; email: string; image: string | null } | null;
  items: Array<{
    id: string;
    bottleSize: number;
    quantity: number;
    fragrance: { model: string; brand: { name: string } };
  }>;
};

function orderHref(order: OrdersTableRow) {
  return order.channel === "POS"
    ? `/admin/pos/receipt/${order.id}`
    : `/admin/orders/${order.id}`;
}

function orderLabel(order: OrdersTableRow) {
  return order.receiptNumber || order.id.slice(0, 8).toUpperCase();
}

function formatOrderDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatItemLine(item: OrdersTableRow["items"][number]) {
  const name = `${item.fragrance.brand.name} ${item.fragrance.model}`;
  const size = item.bottleSize ? ` · ${item.bottleSize}ml` : "";
  const qty = item.quantity > 1 ? ` × ${item.quantity}` : "";
  return `${name}${size}${qty}`;
}

function ChannelBadge({ channel }: { channel: OrderChannel }) {
  const isPos = channel === "POS";
  return (
    <span
      className={
        isPos
          ? "inline-flex rounded-full bg-[#03045e]/[0.07] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#03045e] ring-1 ring-[#03045e]/10"
          : "inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-mocha ring-1 ring-stone-200/90"
      }
    >
      {isPos ? "POS" : "Online"}
    </span>
  );
}

export function OrdersTable({ orders }: { orders: OrdersTableRow[] }) {
  if (!orders.length) {
    return (
      <div className="rounded-2xl bg-white ring-1 ring-black/[0.04] shadow-sm">
        <AdminEmptyState message="No orders match your filters." />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.04] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-[#fafafa]/80">
              {[
                "Order",
                "Channel",
                "Customer",
                "Branch",
                "Items",
                "Total",
                "Status",
                "Date",
              ].map((label) => (
                <th
                  key={label}
                  className="px-5 py-3.5 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-mocha"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {orders.map((order) => {
              return (
                <tr
                  key={order.id}
                  className="group transition-colors hover:bg-[#fafafa]/70"
                >
                  <td className="px-5 py-4 align-top">
                    <Link
                      href={orderHref(order)}
                      className="font-mono text-[13px] font-semibold text-[#03045e] hover:underline underline-offset-2"
                    >
                      {orderLabel(order)}
                    </Link>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <ChannelBadge channel={order.channel} />
                  </td>
                  <td className="px-5 py-4 align-top min-w-[10rem]">
                    <div className="flex items-start gap-2.5">
                      {order.channel === "POS" && order.posUser ? (
                        <StaffAvatar
                          name={order.posUser.name}
                          email={order.posUser.email}
                          image={order.posUser.image}
                          size="xs"
                          className="mt-0.5"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <p className="font-medium text-espresso truncate">
                          {order.shippingName || order.email}
                        </p>
                        {order.channel === "POS" && order.posUser ? (
                          <p className="text-xs text-mocha mt-0.5 truncate">
                            Cashier · {order.posUser.name || order.posUser.email}
                          </p>
                        ) : (
                          <p className="text-xs text-mocha mt-0.5 truncate">{order.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top text-xs text-mocha max-w-[9rem]">
                    <span className="line-clamp-2">
                      {order.fulfillmentBranch?.name || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-top min-w-[12rem] max-w-[22rem]">
                    {order.items.length ? (
                      <ul className="space-y-1.5">
                        {order.items.map((item) => (
                          <li
                            key={item.id}
                            className="text-xs text-espresso leading-snug"
                          >
                            {formatItemLine(item)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-mocha">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 align-top whitespace-nowrap">
                    <span className="font-semibold tabular-nums text-[#03045e]">
                      {formatPrice(order.total)}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <OrderStatusSelect orderId={order.id} status={order.status} />
                  </td>
                  <td className="px-5 py-4 align-top whitespace-nowrap text-xs text-mocha tabular-nums">
                    {formatOrderDate(order.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-stone-100 bg-[#fafafa]/50 px-5 py-3 text-xs text-mocha">
        {orders.length} order{orders.length === 1 ? "" : "s"}
      </div>
    </div>
  );
}
