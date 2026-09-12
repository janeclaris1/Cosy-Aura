import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { countryScopedBranchWhere, requireAdminApi, scopedBranchIds } from "@/lib/admin";
import { aggregateBranchReportRows } from "@/lib/branch-reports";

export async function GET() {
  const { ctx, error } = await requireAdminApi("reports.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = scopedBranchIds(ctx);
  const branchWhere =
    scope === "all" ? countryScopedBranchWhere(ctx) : { id: { in: scope } };

  const branches = await prisma.branch.findMany({
    where: { ...branchWhere, active: true },
    orderBy: [{ country: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      country: true,
      city: true,
      isDefault: true,
      createdAt: true,
    },
  });

  const branchIds = branches.map((b) => b.id);

  const [orders, stockAggs, transferOut, transferIn] = await Promise.all([
    branchIds.length
      ? prisma.order.findMany({
          where: {
            OR: [
              { fulfillmentBranchId: { in: branchIds } },
              { fulfillmentBranchId: null, shippingCountry: { not: null } },
            ],
          },
          select: {
            fulfillmentBranchId: true,
            shippingCountry: true,
            status: true,
            total: true,
            channel: true,
          },
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

  const { rows, totals } = aggregateBranchReportRows(
    branches,
    orders,
    stockByBranch,
    outByBranch,
    inByBranch
  );

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    rows,
    totals,
  });
}
