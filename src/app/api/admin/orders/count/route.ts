import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { orderBranchWhere, requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { ctx, error } = await requireAdminApi("orders.read");
  if (error) return error;

  const branchWhere = orderBranchWhere(ctx) as Prisma.OrderWhereInput | undefined;

  /** Open orders still needing fulfilment (drops when marked Delivered, Cancelled, or Refunded). */
  const total = await prisma.order.count({
    where: {
      ...branchWhere,
      status: { notIn: ["DELIVERED", "CANCELLED", "REFUNDED"] },
    },
  });

  return NextResponse.json({ total });
}
