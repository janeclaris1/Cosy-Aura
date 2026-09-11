import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Mail,
  Package,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  Warehouse,
} from "lucide-react";
import { AdminDashboardCharts } from "@/components/admin/AdminDashboardCharts";
import { requireAdminPage, orderBranchWhere } from "@/lib/admin";
import { buildDashboardChartData } from "@/lib/dashboard-analytics";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

const CHART_PERIOD_DAYS = 30;

const PIPELINE_STATUSES = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
] as const;

type QuickLink = { href: string; label: string; primary?: boolean };

const QUICK_LINKS: QuickLink[] = [
  { href: "/admin/fragrances/new", label: "Add fragrance", primary: true },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/pos", label: "Point of sale" },
  { href: "/admin/stock", label: "Branch stock" },
  { href: "/admin/attendance", label: "Attendance" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/transfers", label: "Transfers" },
  { href: "/admin/branches", label: "Branches" },
];

function statusTone(status: string) {
  switch (status) {
    case "PAID":
    case "DELIVERED":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200/80";
    case "PROCESSING":
    case "SHIPPED":
      return "bg-sky-50 text-sky-800 ring-sky-200/80";
    case "PENDING":
      return "bg-amber-50 text-amber-900 ring-amber-200/80";
    case "CANCELLED":
    case "REFUNDED":
      return "bg-stone-100 text-stone-600 ring-stone-200/80";
    default:
      return "bg-stone-50 text-stone-700 ring-stone-200/60";
  }
}

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

  const chartSince = new Date();
  chartSince.setUTCDate(chartSince.getUTCDate() - (CHART_PERIOD_DAYS - 1));
  chartSince.setUTCHours(0, 0, 0, 0);

  const [
    totalFragrances,
    totalOrders,
    revenue,
    recentOrders,
    statusCounts,
    chartOrders,
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
    prisma.order.findMany({
      where: {
        ...orderWhere,
        createdAt: { gte: chartSince },
      },
      select: {
        createdAt: true,
        total: true,
        status: true,
        channel: true,
      },
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

  const chartData = buildDashboardChartData(
    chartOrders,
    statusCounts.map((s) => ({ status: s.status, count: s._count })),
    CHART_PERIOD_DAYS
  );

  const scopeLabel = ctx.isSuperAdmin || ctx.isGlobal
    ? "All branches"
    : ctx.staffRole === "COUNTRY_MANAGER" && ctx.staffCountry
      ? `${ctx.staffCountry} operations`
      : ctx.branchIds.length
        ? "Your branches"
        : "Limited scope";

  const greeting = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="max-w-6xl space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-mocha mb-2">
            Overview
          </p>
          <h1 className="font-playfair text-3xl text-[#03045e]">Dashboard</h1>
          <p className="text-sm text-mocha/90 mt-2">{greeting}</p>
        </div>
        <span className="inline-flex self-start items-center gap-2 text-xs uppercase tracking-[0.12em] text-[#03045e] bg-white px-3 py-2 ring-1 ring-black/[0.06] shadow-sm">
          <Store className="w-3.5 h-3.5" strokeWidth={1.75} />
          {scopeLabel}
        </span>
      </header>

      {/* Primary metrics */}
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-px bg-stone-200/50 shadow-sm ring-1 ring-black/[0.04] overflow-hidden">
        <MetricTile
          icon={Package}
          label="Catalogue"
          value={String(totalFragrances)}
          hint="Active fragrances"
          href="/admin/fragrances"
        />
        <MetricTile
          icon={ShoppingCart}
          label="Orders"
          value={String(totalOrders)}
          hint="Non-cancelled"
          href="/admin/orders"
        />
        <MetricTile
          icon={Sparkles}
          label="Revenue"
          value={formatPrice(revenue._sum.total || 0)}
          hint="Paid & fulfilled"
        />
        <MetricTile
          icon={Truck}
          label="To fulfil"
          value={String(paidAwaitingShip)}
          hint="Paid or processing"
          href="/admin/orders?status=PAID"
          accent
        />
      </section>

      <AdminDashboardCharts
        daily={chartData.daily}
        channels={chartData.channels}
        statuses={chartData.statuses}
        periodDays={chartData.periodDays}
      />

      {/* Attention */}
      <section className="grid sm:grid-cols-3 gap-4">
        <AttentionCard
          href="/admin/notifications"
          icon={Bell}
          label="Unread alerts"
          value={unreadNotifications}
          urgent={unreadNotifications > 0}
        />
        <AttentionCard
          href="/admin/enquiries"
          icon={Mail}
          label="Unread enquiries"
          value={unreadEnquiries}
          urgent={unreadEnquiries > 0}
        />
        <AttentionCard
          href="/admin/stock"
          icon={Warehouse}
          label="Low stock lines"
          value={lowStockRows}
          hint="≤ 5 units"
          urgent={lowStockRows > 0}
        />
      </section>

      {/* Pipeline + quick actions */}
      <div className="grid lg:grid-cols-5 gap-6">
        <section className="lg:col-span-3 bg-white shadow-sm ring-1 ring-black/[0.04] px-5 py-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-playfair text-lg text-[#03045e]">Order pipeline</h2>
              <p className="text-xs text-mocha mt-0.5">Tap a stage to filter orders</p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs text-[#03045e] hover:underline inline-flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {PIPELINE_STATUSES.map((status) => (
              <Link
                key={status}
                href={`/admin/orders?status=${status}`}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 text-xs font-medium ring-1 transition-colors hover:brightness-[0.98]",
                  statusTone(status)
                )}
              >
                <span className="uppercase tracking-wide">{status}</span>
                <span className="tabular-nums font-semibold">{byStatus[status] || 0}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="lg:col-span-2 bg-white shadow-sm ring-1 ring-black/[0.04] px-5 py-5">
          <h2 className="font-playfair text-lg text-[#03045e] mb-1">Quick actions</h2>
          <p className="text-xs text-mocha mb-4">Jump to common tasks</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-xs px-3 py-2.5 text-center transition-colors ring-1",
                  link.primary
                    ? "bg-[#03045e] text-white ring-[#03045e] hover:bg-[#02033f]"
                    : "bg-[#fafafa] text-espresso ring-stone-200/80 hover:bg-stone-50"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Recent orders */}
      <section className="bg-white shadow-sm ring-1 ring-black/[0.04] overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-playfair text-lg text-[#03045e]">Recent orders</h2>
            <p className="text-xs text-mocha mt-0.5">Latest activity in your scope</p>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs text-[#03045e] hover:underline inline-flex items-center gap-1 shrink-0"
          >
            All orders
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-mocha bg-[#fafafa]">
                <th className="px-5 py-3 font-medium">Order</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Branch</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Items</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {recentOrders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-[#fafafa]/80 transition-colors"
                >
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-xs text-[#03045e] hover:underline"
                    >
                      {order.receiptNumber ||
                        order.id.slice(0, 8).toUpperCase()}
                    </Link>
                    {order.channel === "POS" && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-mocha">
                        POS
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-mocha truncate max-w-[12rem]">
                    {order.email}
                  </td>
                  <td className="px-5 py-4 text-mocha text-xs hidden md:table-cell">
                    {order.fulfillmentBranch
                      ? `${order.fulfillmentBranch.name}`
                      : "—"}
                  </td>
                  <td className="px-5 py-4 text-mocha tabular-nums hidden sm:table-cell">
                    {order.items.length}
                  </td>
                  <td className="px-5 py-4 font-medium text-espresso tabular-nums">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "inline-flex px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1",
                        statusTone(order.status)
                      )}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-mocha text-xs hidden lg:table-cell tabular-nums">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-mocha">
                    No orders yet — they&apos;ll appear here as sales come in.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  hint,
  href,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  href?: string;
  accent?: boolean;
}) {
  const content = (
    <div className="bg-white px-5 py-5 h-full flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-mocha">{label}</p>
          <p
            className={cn(
              "font-playfair text-3xl leading-none mt-2",
              accent ? "text-[#c8102e]" : "text-[#03045e]"
            )}
          >
            {value}
          </p>
          {hint && <p className="text-xs text-mocha mt-2">{hint}</p>}
        </div>
        <div
          className={cn(
            "rounded-full p-2.5 shrink-0",
            accent ? "bg-[#c8102e]/8 text-[#c8102e]" : "bg-[#03045e]/5 text-[#03045e]"
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
      </div>
      {href && (
        <span className="mt-auto pt-4 text-[11px] text-[#03045e]/70 inline-flex items-center gap-1 group-hover:text-[#03045e]">
          Open
          <ArrowUpRight className="w-3 h-3" />
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group block h-full hover:bg-stone-50/50 transition-colors">
        {content}
      </Link>
    );
  }

  return content;
}

function AttentionCard({
  href,
  icon: Icon,
  label,
  value,
  hint,
  urgent,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: number;
  hint?: string;
  urgent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group bg-white shadow-sm ring-1 ring-black/[0.04] px-5 py-4 flex items-center gap-4 transition-all hover:ring-[#03045e]/10 hover:shadow-md",
        urgent && "ring-amber-200/60"
      )}
    >
      <div
        className={cn(
          "rounded-full p-3 shrink-0 transition-colors",
          urgent
            ? "bg-amber-50 text-amber-800 group-hover:bg-amber-100"
            : "bg-stone-50 text-stone-500 group-hover:bg-[#03045e]/5 group-hover:text-[#03045e]"
        )}
      >
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.14em] text-mocha">{label}</p>
        <p className="font-playfair text-2xl text-[#03045e] leading-none mt-1 tabular-nums">
          {value}
        </p>
        {hint && <p className="text-xs text-mocha mt-1">{hint}</p>}
      </div>
      <ArrowUpRight className="w-4 h-4 text-mocha/40 group-hover:text-[#03045e] shrink-0" />
    </Link>
  );
}
