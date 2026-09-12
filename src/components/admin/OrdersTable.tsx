import Link from "next/link";
import { OrderItemsCell } from "@/components/admin/OrderItemsCell";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import { StaffAvatar } from "@/components/admin/StaffAvatar";
import { AdminEmptyState } from "@/components/admin/admin-ui";
import {
  BOOK_CURRENCY,
  formatOrderBookTotal,
  formatOrderPaidAmount,
} from "@/lib/order-money";
import { paymentGatewayLabel } from "@/lib/order-payment";
import type { OrderChannel, OrderStatus, PosPaymentMethod } from "@prisma/client";

export type OrdersTableRow = {
  id: string;
  receiptNumber: string | null;
  channel: OrderChannel;
  email: string;
  shippingName: string | null;
  total: number;
  chargeAmount: number | null;
  chargeCurrency: string | null;
  paymentProvider: string | null;
  posPaymentMethod: PosPaymentMethod | null;
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

function formatOrderDateTime(date: Date) {
  return {
    date: new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date),
  };
}

function OrderTotalCell({ order }: { order: OrdersTableRow }) {
  const hasForeignCharge =
    order.chargeAmount != null &&
    order.chargeCurrency &&
    order.chargeCurrency.toUpperCase() !== BOOK_CURRENCY;

  return (
    <div className="min-w-0 max-w-[9rem]">
      <p className="font-semibold tabular-nums text-[#03045e] text-xs leading-tight">
        {formatOrderPaidAmount(order)}
      </p>
      {hasForeignCharge ? (
        <p className="text-[10px] text-mocha tabular-nums mt-0.5 leading-snug">
          {formatOrderBookTotal(order)} book
        </p>
      ) : null}
    </div>
  );
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
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-[8%]" />
          <col className="w-[7%]" />
          <col className="w-[16%]" />
          <col className="w-[10%]" />
          <col className="w-[9%]" />
          <col className="w-[11%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[9%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-stone-100 bg-[#fafafa]/80">
            {[
              "Order",
              "Channel",
              "Customer",
              "Branch",
              "Items",
              "Total",
              "Payment",
              "Status",
              "Date",
            ].map((label) => (
              <th
                key={label}
                className="px-3 py-3 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-mocha"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {orders.map((order) => {
            const { date, time } = formatOrderDateTime(order.createdAt);

            return (
              <tr
                key={order.id}
                className="group transition-colors hover:bg-[#fafafa]/70"
              >
                <td className="px-3 py-3.5 align-top">
                  <Link
                    href={orderHref(order)}
                    className="font-mono text-[12px] font-semibold text-[#03045e] hover:underline underline-offset-2 break-all"
                  >
                    {orderLabel(order)}
                  </Link>
                </td>
                <td className="px-3 py-3.5 align-top">
                  <ChannelBadge channel={order.channel} />
                </td>
                <td className="px-3 py-3.5 align-top">
                  <div className="flex items-start gap-2 min-w-0">
                    {order.channel === "POS" && order.posUser ? (
                      <StaffAvatar
                        name={order.posUser.name}
                        email={order.posUser.email}
                        image={order.posUser.image}
                        size="xs"
                        className="mt-0.5 shrink-0"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="font-medium text-espresso truncate text-xs">
                        {order.shippingName || order.email}
                      </p>
                      {order.channel === "POS" && order.posUser ? (
                        <p className="text-[11px] text-mocha mt-0.5 truncate">
                          Cashier · {order.posUser.name || order.posUser.email}
                        </p>
                      ) : (
                        <p className="text-[11px] text-mocha mt-0.5 truncate">{order.email}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3.5 align-top text-[11px] text-mocha">
                  <span className="line-clamp-2 break-words">
                    {order.fulfillmentBranch?.name || "—"}
                  </span>
                </td>
                <td className="px-3 py-3.5 align-top">
                  <OrderItemsCell
                    items={order.items}
                    orderLabel={orderLabel(order)}
                    orderHref={orderHref(order)}
                  />
                </td>
                <td className="px-3 py-3.5 align-top overflow-hidden">
                  <OrderTotalCell order={order} />
                </td>
                <td className="px-3 py-3.5 align-top text-[11px] text-espresso overflow-hidden">
                  <span className="block leading-snug break-words">
                    {paymentGatewayLabel(order)}
                  </span>
                </td>
                <td className="px-3 py-3.5 align-top">
                  <div className="max-w-full">
                    <OrderStatusSelect orderId={order.id} status={order.status} />
                  </div>
                </td>
                <td className="px-3 py-3.5 align-top text-[11px] text-mocha tabular-nums">
                  <div>{date}</div>
                  <div className="text-mocha/70 mt-0.5">{time}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="border-t border-stone-100 bg-[#fafafa]/50 px-5 py-3 text-xs text-mocha">
        {orders.length} order{orders.length === 1 ? "" : "s"}
      </div>
    </div>
  );
}
