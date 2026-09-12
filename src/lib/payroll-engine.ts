import "server-only";

import type { EmployeeProfile, PayRun, User } from "@prisma/client";
import { fetchMonthlyAbsenceReport } from "@/lib/attendance-absence-report";
import type { AdminContext } from "@/lib/admin";
import { computePayslip } from "@/lib/payroll-gh";
import { monthToDateRange } from "@/lib/hr-scope";
import { prisma } from "@/lib/prisma";

type EmployeeWithUser = EmployeeProfile & {
  user: Pick<User, "id" | "name" | "email" | "staffCountry" | "activeStaff">;
};

export type GeneratedPayRunLine = {
  employeeId: string;
  userId: string;
  staffName: string;
  staffEmail: string;
  basicSalary: number;
  allowances: number;
  overtime: number;
  bonus: number;
  grossPay: number;
  paye: number;
  ssnitEmployee: number;
  ssnitEmployer: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  proRateFactor: number;
};

function proRateFromAttendance(input: {
  workingDays: number;
  presentDays: number;
  leaveDays: number;
}): number {
  if (input.workingDays <= 0) return 1;
  const paidDays = input.presentDays + input.leaveDays;
  return Math.min(1, Math.max(0, paidDays / input.workingDays));
}

export async function generatePayRunLines(input: {
  ctx: AdminContext;
  country: string;
  periodLabel: string;
  branchId?: string | null;
}): Promise<GeneratedPayRunLine[]> {
  const { periodStart, periodEnd } = monthToDateRange(input.periodLabel);

  const staffWhere: Record<string, unknown> = {
    role: "ADMIN",
    activeStaff: true,
    staffCountry: input.country,
    employeeProfile: { isNot: null },
  };

  if (input.branchId) {
    staffWhere.staffAssignments = { some: { branchId: input.branchId } };
  }

  const employees = await prisma.employeeProfile.findMany({
    where: {
      user: staffWhere,
      OR: [{ terminationDate: null }, { terminationDate: { gte: periodStart } }],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          staffCountry: true,
          activeStaff: true,
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  const absenceReport = await fetchMonthlyAbsenceReport(input.ctx, {
    fromMonth: input.periodLabel,
    toMonth: input.periodLabel,
    branchId: input.branchId || undefined,
  });

  const absenceRows = absenceReport.ok ? absenceReport.rows : [];

  const absenceByUser = new Map(
    absenceRows.map((r) => [
      r.userId,
      {
        workingDays: r.workingDays,
        presentDays: r.presentDays,
        absentDays: r.absentDays,
      },
    ])
  );

  const approvedLeave = await prisma.leaveRequest.findMany({
    where: {
      status: "APPROVED",
      startDate: { lte: periodEnd },
      endDate: { gte: periodStart },
      employee: {
        user: staffWhere,
      },
    },
    select: {
      employeeId: true,
      days: true,
    },
  });

  const leaveDaysByEmployee = new Map<string, number>();
  for (const row of approvedLeave) {
    leaveDaysByEmployee.set(
      row.employeeId,
      (leaveDaysByEmployee.get(row.employeeId) || 0) + row.days
    );
  }

  const lines: GeneratedPayRunLine[] = [];

  for (const emp of employees as EmployeeWithUser[]) {
    const attendance = absenceByUser.get(emp.userId);
    const workingDays = attendance?.workingDays ?? 0;
    const presentDays = attendance?.presentDays ?? 0;
    const absentDays = attendance?.absentDays ?? 0;
    const leaveDays = leaveDaysByEmployee.get(emp.id) ?? 0;

    const proRateFactor = proRateFromAttendance({
      workingDays,
      presentDays,
      leaveDays,
    });

    const slip = computePayslip({
      basicSalary: emp.basicSalary,
      housingAllowance: emp.housingAllowance,
      transportAllowance: emp.transportAllowance,
      otherAllowances: emp.otherAllowances,
      proRateFactor,
    });

    lines.push({
      employeeId: emp.id,
      userId: emp.userId,
      staffName: emp.user.name || emp.user.email,
      staffEmail: emp.user.email,
      basicSalary: slip.basicSalary,
      allowances: slip.allowances,
      overtime: slip.overtime,
      bonus: slip.bonus,
      grossPay: slip.grossPay,
      paye: slip.paye,
      ssnitEmployee: slip.ssnitEmployee,
      ssnitEmployer: slip.ssnitEmployer,
      otherDeductions: slip.otherDeductions,
      totalDeductions: slip.totalDeductions,
      netPay: slip.netPay,
      workingDays,
      presentDays,
      absentDays,
      leaveDays,
      proRateFactor,
    });
  }

  return lines;
}

export function summarizePayRunLines(
  lines: GeneratedPayRunLine[]
): Pick<PayRun, "totalGross" | "totalDeductions" | "totalNet" | "totalEmployerSsnit"> {
  return {
    totalGross: lines.reduce((s, l) => s + l.grossPay, 0),
    totalDeductions: lines.reduce((s, l) => s + l.totalDeductions, 0),
    totalNet: lines.reduce((s, l) => s + l.netPay, 0),
    totalEmployerSsnit: lines.reduce((s, l) => s + l.ssnitEmployer, 0),
  };
}
