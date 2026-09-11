import { requireAdminPage, orderBranchWhere } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { OrdersFilters } from "@/components/admin/OrdersFilters";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { AdminButton, AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";
import type { OrderChannel, OrderStatus, Prisma } from "@prisma/client";

function buildOrdersHref(params: {
  status?: string;
  channel?: string;
  q?: string;
}) {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.channel) sp.set("channel", params.channel);
  if (params.q) sp.set("q", params.q);
  const qs = sp.toString();
  return `/admin/orders${qs ? `?${qs}` : ""}`;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; channel?: string; q?: string };
}) {
  const ctx = await requireAdminPage("orders.read");

  const status = searchParams.status;
  const channel = searchParams.channel?.toUpperCase();
  const q = searchParams.q?.trim();

  const where: Prisma.OrderWhereInput = {
    ...(orderBranchWhere(ctx) as Prisma.OrderWhereInput),
  };
  if (status) where.status = status as OrderStatus;
  if (channel === "WEB" || channel === "POS") {
    where.channel = channel as OrderChannel;
  }
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { receiptNumber: { contains: q, mode: "insensitive" } },
      { shippingName: { contains: q, mode: "insensitive" } },
      { shippingPhone: { contains: q, mode: "insensitive" } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { include: { fragrance: { include: { brand: true } } } },
      fulfillmentBranch: { select: { name: true, country: true } },
      posUser: { select: { name: true, email: true, image: true } },
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

  const channels = [
    { id: "ALL", label: "All" },
    { id: "WEB", label: "Online" },
    { id: "POS", label: "POS" },
  ];

  const channelPills = channels.map((c) => ({
    id: c.id,
    label: c.label,
    href: buildOrdersHref({
      status: status || undefined,
      channel: c.id === "ALL" ? undefined : c.id,
      q: q || undefined,
    }),
  }));

  const statusPills = statuses.map((s) => ({
    id: s,
    label: s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase(),
    href: buildOrdersHref({
      status: s === "ALL" ? undefined : s,
      channel: channel && channel !== "ALL" ? channel : undefined,
      q: q || undefined,
    }),
  }));

  const activeChannel = !channel || channel === "ALL" ? "ALL" : channel;
  const activeStatus = !status ? "ALL" : status;

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Sales"
        title="Orders"
        description="Online checkout and in-store POS sales in your branch scope."
        actions={
          <AdminButton
            href={`/api/admin/reports/export?kind=orders${channel && channel !== "ALL" ? `&channel=${channel}` : ""}`}
            variant="secondary"
          >
            Export CSV
          </AdminButton>
        }
      />

      <OrdersFilters
        q={q}
        status={status}
        channel={channel}
        channelPills={channelPills}
        statusPills={statusPills}
        activeChannel={activeChannel}
        activeStatus={activeStatus}
      />

      <OrdersTable orders={orders} />
    </div>
  );
}
