import { NextResponse } from "next/server";
import {
  countryScopedBranchWhere,
  requireAdminApi,
  orderBranchWhere,
  scopedBranchIds,
} from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  aggregateTaxReport,
  formatTaxMonthLabel,
  monthRangeForFilter,
} from "@/lib/tax-reports";

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("reports.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || currentMonthKey();
  const range = monthRangeForFilter(month);

  if (!range) {
    return NextResponse.json({ error: "Invalid month (use YYYY-MM)" }, { status: 400 });
  }

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

  const orderScope = orderBranchWhere(ctx);

  const orders = await prisma.order.findMany({
    where: {
      ...(orderScope || {}),
      createdAt: { gte: range.start, lt: range.end },
    },
    select: {
      id: true,
      createdAt: true,
      status: true,
      channel: true,
      total: true,
      shippingCost: true,
      posDiscountAmount: true,
      fulfillmentBranchId: true,
      shippingCountry: true,
      items: { select: { price: true, quantity: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const { totals, byBranch, byDay } = aggregateTaxReport(orders, branches);

  return NextResponse.json({
    month,
    monthLabel: formatTaxMonthLabel(month),
    generatedAt: new Date().toISOString(),
    totals,
    byBranch,
    byDay,
  });
}
