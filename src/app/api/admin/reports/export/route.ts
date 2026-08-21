import { NextResponse } from "next/server";
import { requireAdminApi, orderBranchWhere, scopedBranchIds } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("reports.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const kind = String(searchParams.get("kind") || "branches").toLowerCase();

  if (kind === "orders") {
    const { ctx: orderCtx, error: orderErr } = await requireAdminApi("orders.read");
    if (orderErr) return orderErr;
    if (!orderCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const scope = orderBranchWhere(orderCtx);
    const orders = await prisma.order.findMany({
      where: { ...(scope || {}), status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      take: 2000,
      include: {
        fulfillmentBranch: { select: { name: true, country: true } },
        items: { select: { quantity: true } },
      },
    });

    const header = [
      "order_id",
      "short_id",
      "created_at",
      "status",
      "email",
      "total_ghs",
      "items",
      "country",
      "branch",
      "payment_provider",
      "delivery_provider",
    ];
    const lines = [header.join(",")];
    for (const o of orders) {
      lines.push(
        [
          csvEscape(o.id),
          csvEscape(o.id.slice(0, 8).toUpperCase()),
          csvEscape(o.createdAt.toISOString()),
          csvEscape(o.status),
          csvEscape(o.email),
          csvEscape(o.total.toFixed(2)),
          csvEscape(o.items.reduce((n, i) => n + i.quantity, 0)),
          csvEscape(o.shippingCountry || ""),
          csvEscape(
            o.fulfillmentBranch
              ? `${o.fulfillmentBranch.name} (${o.fulfillmentBranch.country})`
              : ""
          ),
          csvEscape(o.paymentProvider || ""),
          csvEscape(o.deliveryProvider || ""),
        ].join(",")
      );
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  // Default: branch roll-up (same logic as reports API)
  const scope = scopedBranchIds(ctx);
  const branchWhere =
    scope === "all"
      ? ctx.staffRole === "COUNTRY_MANAGER" && ctx.staffCountry
        ? { country: ctx.staffCountry }
        : {}
      : { id: { in: scope } };

  const branches = await prisma.branch.findMany({
    where: { ...branchWhere, active: true },
    orderBy: [{ country: "asc" }, { name: "asc" }],
    select: { id: true, name: true, country: true, city: true },
  });
  const branchIds = branches.map((b) => b.id);

  const [orderGroups, stockAggs] = await Promise.all([
    branchIds.length
      ? prisma.order.groupBy({
          by: ["fulfillmentBranchId", "status"],
          where: {
            fulfillmentBranchId: { in: branchIds },
            status: { not: "CANCELLED" },
          },
          _count: true,
          _sum: { total: true },
        })
      : Promise.resolve([]),
    branchIds.length
      ? prisma.branchStock.groupBy({
          by: ["branchId"],
          where: { branchId: { in: branchIds } },
          _sum: { quantity: true },
        })
      : Promise.resolve([]),
  ]);

  const stockByBranch = new Map(
    stockAggs.map((r) => [r.branchId, Number(r._sum.quantity || 0)])
  );

  const header = [
    "branch",
    "country",
    "city",
    "orders",
    "revenue_ghs",
    "to_fulfil",
    "delivered",
    "stock_units",
  ];
  const lines = [header.join(",")];
  for (const branch of branches) {
    const related = orderGroups.filter((g) => g.fulfillmentBranchId === branch.id);
    const orders = related.reduce((n, g) => n + g._count, 0);
    const revenue = related.reduce((n, g) => n + Number(g._sum.total || 0), 0);
    const toFulfil = related
      .filter((g) => g.status === "PAID" || g.status === "PROCESSING")
      .reduce((n, g) => n + g._count, 0);
    const delivered = related
      .filter((g) => g.status === "DELIVERED")
      .reduce((n, g) => n + g._count, 0);
    lines.push(
      [
        csvEscape(branch.name),
        csvEscape(branch.country),
        csvEscape(branch.city || ""),
        csvEscape(orders),
        csvEscape(revenue.toFixed(2)),
        csvEscape(toFulfil),
        csvEscape(delivered),
        csvEscape(stockByBranch.get(branch.id) || 0),
      ].join(",")
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="branch-reports-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
