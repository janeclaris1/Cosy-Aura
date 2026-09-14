import { NextResponse } from "next/server";
import { requireAdminApi, scopedBranchIds } from "@/lib/admin";
import { monthToDateRange } from "@/lib/hr-scope";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("hr.read");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const month =
    searchParams.get("month") ||
    `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;
  const status = searchParams.get("status")?.trim().toUpperCase();
  const employeeId = searchParams.get("employeeId")?.trim();
  const branchId = searchParams.get("branchId")?.trim();

  const { periodStart, periodEnd } = monthToDateRange(month);
  const branchScope = scopedBranchIds(ctx);

  const where: Record<string, unknown> = {
    earnedAt: { gte: periodStart, lte: periodEnd },
  };

  if (status && ["EARNED", "VOIDED", "PAID"].includes(status)) {
    where.status = status;
  }
  if (employeeId) where.employeeId = employeeId;
  if (branchId) {
    where.branchId = branchId;
  } else if (Array.isArray(branchScope) && branchScope.length > 0) {
    where.branchId = { in: branchScope };
  }

  const [entries, summary] = await Promise.all([
    prisma.staffCommissionEntry.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
        branch: { select: { id: true, name: true, country: true } },
        order: { select: { receiptNumber: true, createdAt: true } },
      },
      orderBy: { earnedAt: "desc" },
      take: 200,
    }),
    prisma.staffCommissionEntry.groupBy({
      by: ["status"],
      where,
      _sum: { commissionGhs: true },
      _count: { id: true },
    }),
  ]);

  const totals = {
    earned: 0,
    paid: 0,
    voided: 0,
  };
  for (const row of summary) {
    const amount = Number(row._sum.commissionGhs || 0);
    if (row.status === "EARNED") totals.earned = amount;
    if (row.status === "PAID") totals.paid = amount;
    if (row.status === "VOIDED") totals.voided = amount;
  }

  return NextResponse.json({ entries, month, totals });
}
