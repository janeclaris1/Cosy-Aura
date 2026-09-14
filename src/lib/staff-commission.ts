import "server-only";

import type { FragranceFamily, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { roundMoney } from "@/lib/payroll-gh";

function ruleMatchesCountry(ruleCountry: string, branchCountry: string): boolean {
  const c = ruleCountry.toUpperCase();
  if (c === "ALL") return true;
  return c === branchCountry.toUpperCase();
}

export async function getActiveCommissionRules(branchCountry: string) {
  const rules = await prisma.commissionCategoryRule.findMany({
    where: { active: true },
    orderBy: { fragranceFamily: "asc" },
  });
  return rules.filter((r) => ruleMatchesCountry(r.country, branchCountry));
}

function rateForFamily(
  rules: Array<{ fragranceFamily: FragranceFamily; ratePercent: number }>,
  family: FragranceFamily
): number | null {
  const match = rules.find((r) => r.fragranceFamily === family);
  return match ? match.ratePercent : null;
}

export async function resolveCommissionEmployeeByNumber(
  employeeNumber: string
): Promise<
  | { ok: true; employeeId: string; name: string; employeeNumber: string }
  | { ok: false; reason: string }
> {
  const normalized = employeeNumber.trim();
  if (!normalized) {
    return { ok: false, reason: "Staff ID is required" };
  }

  const profile = await prisma.employeeProfile.findFirst({
    where: { employeeNumber: { equals: normalized, mode: "insensitive" } },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!profile) {
    return { ok: false, reason: "No employee found with that staff ID" };
  }
  if (profile.terminationDate && profile.terminationDate <= new Date()) {
    return { ok: false, reason: "That employee is no longer active" };
  }

  const name = profile.user.name?.trim() || profile.user.email;
  return {
    ok: true,
    employeeId: profile.id,
    name,
    employeeNumber: profile.employeeNumber || normalized,
  };
}

/**
 * Create commission rows for a completed POS sale (idempotent per order).
 * Call after inventory is committed (immediate POS or credit fulfillment).
 */
export async function createStaffCommissionsForOrder(orderId: string): Promise<number> {
  const existing = await prisma.staffCommissionEntry.count({ where: { orderId } });
  if (existing > 0) return 0;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          fragrance: {
            select: {
              model: true,
              fragranceFamily: true,
              brand: { select: { name: true } },
            },
          },
        },
      },
      fulfillmentBranch: { select: { id: true, country: true } },
    },
  });

  if (!order) return 0;
  if (order.channel !== "POS" || !order.fulfillmentBranchId) {
    return 0;
  }
  if (!order.fulfillmentBranch) return 0;

  const employeeId = order.commissionEmployeeId;
  if (!employeeId) return 0;

  const rules = await getActiveCommissionRules(order.fulfillmentBranch.country);
  if (!rules.length) return 0;

  const lineGross = order.items.map((item) => ({
    item,
    gross: roundMoney(item.price * item.quantity),
  }));
  const subtotal = roundMoney(lineGross.reduce((s, l) => s + l.gross, 0));
  const discount = roundMoney(order.posDiscountAmount ?? 0);

  const rows: Prisma.StaffCommissionEntryCreateManyInput[] = [];

  for (const { item, gross } of lineGross) {
    const family = item.fragrance.fragranceFamily;
    const ratePercent = rateForFamily(rules, family);
    if (ratePercent == null || ratePercent <= 0) continue;

    const discountShare =
      subtotal > 0 && discount > 0 ? roundMoney((discount * gross) / subtotal) : 0;
    const lineTotal = roundMoney(Math.max(0, gross - discountShare));
    if (lineTotal <= 0) continue;

    const commissionGhs = roundMoney((lineTotal * ratePercent) / 100);
    if (commissionGhs <= 0) continue;

    rows.push({
      orderId: order.id,
      orderItemId: item.id,
      employeeId,
      branchId: order.fulfillmentBranchId,
      fragranceFamily: family,
      productLabel: `${item.fragrance.brand.name} ${item.fragrance.model}`,
      lineTotalGhs: lineTotal,
      commissionRate: ratePercent,
      commissionGhs,
      status: "EARNED",
      earnedAt: order.inventoryCommittedAt ?? new Date(),
    });
  }

  if (!rows.length) return 0;

  await prisma.staffCommissionEntry.createMany({ data: rows });
  return rows.length;
}

/** Void commissions when a POS sale is refunded. */
export async function voidStaffCommissionsForOrder(orderId: string): Promise<number> {
  const result = await prisma.staffCommissionEntry.updateMany({
    where: { orderId, status: "EARNED" },
    data: { status: "VOIDED", voidedAt: new Date() },
  });
  return result.count;
}

/** Sum unpaid earned commissions for payroll bonus. */
export async function sumEarnedCommissionsForEmployee(input: {
  employeeId: string;
  periodStart: Date;
  periodEnd: Date;
  country: string;
  branchId?: string | null;
}): Promise<number> {
  const where: Prisma.StaffCommissionEntryWhereInput = {
    employeeId: input.employeeId,
    status: "EARNED",
    earnedAt: { gte: input.periodStart, lte: input.periodEnd },
    branch: { country: input.country },
  };
  if (input.branchId) {
    where.branchId = input.branchId;
  }

  const agg = await prisma.staffCommissionEntry.aggregate({
    where,
    _sum: { commissionGhs: true },
  });
  return roundMoney(Number(agg._sum.commissionGhs || 0));
}

/** Link earned commissions to payslip lines when a pay run is marked paid. */
export async function markCommissionsPaidForPayRun(payRunId: string): Promise<number> {
  const payRun = await prisma.payRun.findUnique({
    where: { id: payRunId },
    include: { lines: { select: { id: true, employeeId: true } } },
  });
  if (!payRun) return 0;

  const { periodStart, periodEnd } = await import("@/lib/hr-scope").then((m) =>
    m.monthToDateRange(payRun.periodLabel)
  );

  let updated = 0;
  for (const line of payRun.lines) {
    const result = await prisma.staffCommissionEntry.updateMany({
      where: {
        employeeId: line.employeeId,
        status: "EARNED",
        earnedAt: { gte: periodStart, lte: periodEnd },
        branch: { country: payRun.country },
        ...(payRun.branchId ? { branchId: payRun.branchId } : {}),
      },
      data: {
        status: "PAID",
        paidAt: new Date(),
        payRunLineId: line.id,
      },
    });
    updated += result.count;
  }
  return updated;
}
