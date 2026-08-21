import Link from "next/link";
import {
  Package,
  ShoppingCart,
  DollarSign,
  Bell,
  Truck,
  Mail,
  Warehouse,
} from "lucide-react";
import { requireAdminPage, orderBranchWhere } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

export default async function AdminDashboard() {
  const ctx = await requireAdminPage("dashboard.read");
  const scope = orderBranchWhere(ctx);
  const orderWhere = scope || {};

  const lowStockBranchFilter =
    ctx.isSuperAdmin || ctx.isGlobal
      ? {}
      : ctx.staffRole === "COUNTRY_MANAGER" && ctx.staffCountry
        ? { branch: { country: ctx.staffCountry } }
        : ctx.branchIds.length
          ? { branchId: { in: ctx.branchIds } }
          : { branchId: "__none__" };

  const [
    totalFragrances,
    totalOrders,
    revenue,
    recentOrders,
    statusCounts,
    unreadNotifications,
    unreadEnquiries,
    paidAwaitingShip,
    lowStockRows,
  ] = await Promise.all([
    prisma.fragrance.count(),
    prisma.order.count({
      where: { ...orderWhere, status: { not: "CANCELLED" } },
    }),
    prisma.order.aggregate({
      where: {
        ...orderWhere,
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
      },
      _sum: { total: true },
    }),
    prisma.order.findMany({
      where: orderWhere,
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        fulfillmentBranch: { select: { name: true, country: true } },
      },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: orderWhere,
      _count: true,
    }),
    prisma.adminNotification.count({ where: { read: false } }),
    prisma.contactEnquiry.count({ where: { read: false } }),
    prisma.order.count({
      where: { ...orderWhere, status: { in: ["PAID", "PROCESSING"] } },
    }),
    prisma.branchStock.count({
      where: {
        ...lowStockBranchFilter,
        quantity: { lte: 5 },
      },
    }),
  ]);

  const byStatus = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count])
  );

  const scopeLabel = ctx.isSuperAdmin || ctx.isGlobal
    ? "All branches"
    : ctx.staffRole === "COUNTRY_MANAGER" && ctx.staffCountry
      ? `${ctx.staffCountry} country`
      : ctx.branchIds.length
        ? "Your branches"
        : "No branch scope";

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-playfair text-3xl">Dashboard</h1>
        <p className="text-sm text-mocha">{scopeLabel}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon={Package} label="Total Fragrances" value={String(totalFragrances)} />
        <StatCard icon={ShoppingCart} label="Orders" value={String(totalOrders)} />
        <StatCard
          icon={DollarSign}
          label="Revenue"
          value={formatPrice(revenue._sum.total || 0)}
        />
        <StatCard
          icon={Truck}
          label="To fulfil"
          value={String(paidAwaitingShip)}
          href="/admin/orders?status=PAID"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Link
          href="/admin/notifications"
          className="border border-wf-border rounded-lg p-4 bg-white hover:border-gold transition-colors flex items-center gap-3"
        >
          <Bell className="w-5 h-5 text-gold" />
          <div>
            <p className="text-sm text-wf-gray">Unread alerts</p>
            <p className="font-playfair text-xl">{unreadNotifications}</p>
          </div>
        </Link>
        <Link
          href="/admin/enquiries"
          className="border border-wf-border rounded-lg p-4 bg-white hover:border-gold transition-colors flex items-center gap-3"
        >
          <Mail className="w-5 h-5 text-gold" />
          <div>
            <p className="text-sm text-wf-gray">Unread enquiries</p>
            <p className="font-playfair text-xl">{unreadEnquiries}</p>
          </div>
        </Link>
        <Link
          href="/admin/stock"
          className="border border-wf-border rounded-lg p-4 bg-white hover:border-gold transition-colors flex items-center gap-3"
        >
          <Warehouse className="w-5 h-5 text-gold" />
          <div>
            <p className="text-sm text-wf-gray">Low stock (≤5)</p>
            <p className="font-playfair text-xl">{lowStockRows}</p>
          </div>
        </Link>
      </div>

      <div className="border border-wf-border rounded-lg p-4 bg-white mb-10">
        <p className="text-sm text-wf-gray mb-2">Orders by status</p>
        <div className="flex flex-wrap gap-2">
          {["PAID", "PROCESSING", "SHIPPED", "PENDING"].map((s) => (
            <Link
              key={s}
              href={`/admin/orders?status=${s}`}
              className="text-xs px-2 py-1 bg-wf-light rounded hover:bg-gold/10"
            >
              {s}: {byStatus[s] || 0}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-10">
        <Link href="/admin/fragrances/new" className="btn-gold">
          Add Fragrance
        </Link>
        <Link href="/admin/orders" className="btn-outline">
          All Orders
        </Link>
        <Link href="/admin/stock" className="btn-outline">
          Branch stock
        </Link>
        <Link href="/admin/transfers" className="btn-outline">
          Transfers
        </Link>
        <Link href="/admin/reports" className="btn-outline">
          Reports
        </Link>
        <Link href="/admin/branches" className="btn-outline">
          Branches
        </Link>
      </div>

      <h2 className="font-playfair text-xl mb-4">Recent Orders</h2>
      <div className="border border-wf-border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-wf-light">
            <tr>
              <th className="text-left p-3 font-medium">Order ID</th>
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-left p-3 font-medium">Branch</th>
              <th className="text-left p-3 font-medium">Items</th>
              <th className="text-left p-3 font-medium">Total</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order) => (
              <tr key={order.id} className="border-t border-wf-border">
                <td className="p-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="text-gold hover:underline font-mono text-xs"
                  >
                    {order.id.slice(0, 8).toUpperCase()}
                  </Link>
                </td>
                <td className="p-3">{order.email}</td>
                <td className="p-3 text-mocha text-xs">
                  {order.fulfillmentBranch
                    ? `${order.fulfillmentBranch.name} (${order.fulfillmentBranch.country})`
                    : "—"}
                </td>
                <td className="p-3">{order.items.length}</td>
                <td className="p-3">{formatPrice(order.total)}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 bg-wf-light rounded text-xs">
                    {order.status}
                  </span>
                </td>
                <td className="p-3 text-wf-gray">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {recentOrders.length === 0 && (
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

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5 text-gold" />
        <span className="text-sm text-wf-gray">{label}</span>
      </div>
      <p className="font-playfair text-2xl">{value}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="border border-wf-border rounded-lg p-6 bg-white hover:border-gold transition-colors block"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="border border-wf-border rounded-lg p-6 bg-white">{inner}</div>
  );
}
