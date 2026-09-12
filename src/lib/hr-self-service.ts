import "server-only";

import { defaultMonthKey } from "@/lib/hr-scope";
import { payRunStatusLabel } from "@/lib/payroll-gh";
import { prisma } from "@/lib/prisma";

export async function fetchMyHrSummary(userId: string, staffCountry: string | null) {
  const country = staffCountry || "GH";
  const periodLabel = defaultMonthKey();

  const [user, profile, payslipLines, upcomingPayRun] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        staffRole: true,
        staffCountry: true,
      },
    }),
    prisma.employeeProfile.findUnique({
      where: { userId },
      include: {
        leaveBalances: {
          where: { year: new Date().getUTCFullYear() },
        },
      },
    }),
    prisma.payRunLine.findMany({
      where: {
        userId,
        payRun: { status: { in: ["APPROVED", "PAID"] } },
      },
      include: {
        payRun: {
          select: {
            id: true,
            periodLabel: true,
            periodStart: true,
            periodEnd: true,
            status: true,
            paidAt: true,
            currency: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
    prisma.payRun.findFirst({
      where: {
        country,
        periodLabel,
        status: { in: ["DRAFT", "REVIEW", "APPROVED"] },
      },
      include: {
        lines: {
          where: { userId },
          take: 1,
        },
      },
    }),
  ]);

  const leaveRequests = profile
    ? await prisma.leaveRequest.findMany({
        where: { employeeId: profile.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          leaveType: true,
          startDate: true,
          endDate: true,
          days: true,
          status: true,
          reason: true,
        },
      })
    : [];

  const upcomingLine = upcomingPayRun?.lines[0] ?? null;

  return {
    user,
    profile,
    payslips: payslipLines.map((line) => ({
      id: line.id,
      periodLabel: line.payRun.periodLabel,
      periodStart: line.payRun.periodStart,
      periodEnd: line.payRun.periodEnd,
      status: line.payRun.status,
      statusLabel: payRunStatusLabel(line.payRun.status),
      paidAt: line.payRun.paidAt,
      currency: line.payRun.currency,
      basicSalary: line.basicSalary,
      allowances: line.allowances,
      grossPay: line.grossPay,
      paye: line.paye,
      ssnitEmployee: line.ssnitEmployee,
      totalDeductions: line.totalDeductions,
      netPay: line.netPay,
      presentDays: line.presentDays,
      workingDays: line.workingDays,
    })),
    upcoming: upcomingPayRun
      ? {
          periodLabel: upcomingPayRun.periodLabel,
          status: upcomingPayRun.status,
          statusLabel: payRunStatusLabel(upcomingPayRun.status),
          included: Boolean(upcomingLine),
          estimate: upcomingLine
            ? {
                grossPay: upcomingLine.grossPay,
                totalDeductions: upcomingLine.totalDeductions,
                netPay: upcomingLine.netPay,
              }
            : null,
        }
      : null,
    leaveRequests,
  };
}
