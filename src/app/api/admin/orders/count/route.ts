import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { orderBranchWhere, requireAdminApi } from "@/lib/admin";
import { OPEN_ORDER_STATUSES } from "@/lib/dashboard-analytics";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { ctx, error } = await requireAdminApi("orders.read");
  if (error) return error;

  const branchWhere = orderBranchWhere(ctx) as Prisma.OrderWhereInput | undefined;

  /** Paid orders still in fulfilment — excludes unpaid checkout (PENDING). */
  const total = await prisma.order.count({
    where: {
      ...branchWhere,
      status: { in: [...OPEN_ORDER_STATUSES] },
    },
  });

  return NextResponse.json({ total });
}
