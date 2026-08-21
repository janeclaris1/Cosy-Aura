import Link from "next/link";
import { requireAdminPage, orderBranchWhere } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import type { OrderStatus, Prisma } from "@prisma/client";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const ctx = await requireAdminPage("orders.read");

  const status = searchParams.status;
  const q = searchParams.q?.trim();

  const where: Prisma.OrderWhereInput = {
    ...(orderBranchWhere(ctx) as Prisma.OrderWhereInput),
  };
  if (status) where.status = status as OrderStatus;
  if (q) where.email = { contains: q, mode: "insensitive" };

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { include: { fragrance: { include: { brand: true } } } },
      fulfillmentBranch: { select: { name: true, country: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const statuses = [
    "ALL",
    "PENDING",
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="font-playfair text-3xl">Orders</h1>
        <a
          href="/api/admin/reports/export?kind=orders"
          className="btn-outline text-sm py-2 px-4"
        >
          Export CSV
        </a>
      </div>

      <form className="mb-4" action="/admin/orders" method="get">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="flex gap-2 max-w-md">
          <input
            name="q"
            defaultValue={q || ""}
            placeholder="Search by email..."
            className="flex-1 px-3 py-2 border border-wf-border rounded text-sm bg-white focus:outline-none focus:border-gold"
          />
          <button type="submit" className="btn-outline text-sm py-2 px-4">
            Search
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2 mb-6">
        {statuses.map((s) => {
          const params = new URLSearchParams();
          if (s !== "ALL") params.set("status", s);
          if (q) params.set("q", q);
          const href = `/admin/orders${params.toString() ? `?${params}` : ""}`;
          const active = s === "ALL" ? !status : status === s;
          return (
            <Link
              key={s}
              href={href}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                active
                  ? "bg-gold text-white border-gold"
                  : "bg-white border-wf-border hover:border-gold"
              }`}
            >
              {s === "ALL" ? "All" : s}
            </Link>
          );
        })}
      </div>

      <div className="border border-wf-border rounded-lg overflow-hidden bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-wf-light">
            <tr>
              <th className="text-left p-3 font-medium">Order</th>
              <th className="text-left p-3 font-medium">Customer</th>
              <th className="text-left p-3 font-medium">Branch</th>
              <th className="text-left p-3 font-medium">Items</th>
              <th className="text-left p-3 font-medium">Total</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-wf-border">
                <td className="p-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-mono text-xs text-gold hover:underline"
                  >
                    {order.id.slice(0, 8).toUpperCase()}
                  </Link>
                </td>
                <td className="p-3">{order.email}</td>
                <td className="p-3 text-xs text-wf-gray">
                  {order.fulfillmentBranch
                    ? `${order.fulfillmentBranch.name} (${order.fulfillmentBranch.country})`
                    : "—"}
                </td>
                <td className="p-3">
                  {order.items.map((item) => (
                    <span key={item.id} className="block text-wf-gray text-xs">
                      {item.fragrance.brand.name} {item.fragrance.model}
                    </span>
                  ))}
                </td>
                <td className="p-3">{formatPrice(order.total)}</td>
                <td className="p-3">
                  <OrderStatusSelect orderId={order.id} status={order.status} />
                </td>
                <td className="p-3 text-wf-gray whitespace-nowrap">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-wf-gray">
                  No orders yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
