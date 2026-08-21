import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, scopedBranchIds } from "@/lib/admin";

export async function GET() {
  const { ctx, error } = await requireAdminApi("reports.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const [orderGroups, stockAggs, transferOut, transferIn] = await Promise.all([
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
    branchIds.length
      ? prisma.stockTransfer.groupBy({
          by: ["fromBranchId"],
          where: { fromBranchId: { in: branchIds } },
          _sum: { quantity: true },
          _count: true,
        })
      : Promise.resolve([]),
    branchIds.length
      ? prisma.stockTransfer.groupBy({
          by: ["toBranchId"],
          where: { toBranchId: { in: branchIds } },
          _sum: { quantity: true },
          _count: true,
        })
      : Promise.resolve([]),
  ]);

  const stockByBranch = new Map(
    stockAggs.map((r) => [r.branchId, Number(r._sum.quantity || 0)])
  );
  const outByBranch = new Map(
    transferOut.map((r) => [
      r.fromBranchId,
      { count: r._count, qty: Number(r._sum.quantity || 0) },
    ])
  );
  const inByBranch = new Map(
    transferIn.map((r) => [
      r.toBranchId,
      { count: r._count, qty: Number(r._sum.quantity || 0) },
    ])
  );

  const rows = branches.map((branch) => {
    const related = orderGroups.filter((g) => g.fulfillmentBranchId === branch.id);
    const orders = related.reduce((n, g) => n + g._count, 0);
    const revenue = related.reduce((n, g) => n + Number(g._sum.total || 0), 0);
    const toFulfil = related
      .filter((g) => g.status === "PAID" || g.status === "PROCESSING")
      .reduce((n, g) => n + g._count, 0);
    const delivered = related
      .filter((g) => g.status === "DELIVERED")
      .reduce((n, g) => n + g._count, 0);

    return {
      branchId: branch.id,
      name: branch.name,
      country: branch.country,
      city: branch.city,
      orders,
      revenue,
      toFulfil,
      delivered,
      stockUnits: stockByBranch.get(branch.id) || 0,
      transfersOut: outByBranch.get(branch.id) || { count: 0, qty: 0 },
      transfersIn: inByBranch.get(branch.id) || { count: 0, qty: 0 },
    };
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    rows,
    totals: {
      orders: rows.reduce((n, r) => n + r.orders, 0),
      revenue: rows.reduce((n, r) => n + r.revenue, 0),
      stockUnits: rows.reduce((n, r) => n + r.stockUnits, 0),
      toFulfil: rows.reduce((n, r) => n + r.toFulfil, 0),
    },
  });
}
