import { NextResponse } from "next/server";
import type { EmploymentType, EmployeePaymentMethod, PayFrequency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { hrStaffUserWhere } from "@/lib/hr-scope";
import { DEFAULT_ANNUAL_LEAVE_DAYS } from "@/lib/payroll-gh";

const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"] as const;
const PAY_FREQUENCIES = ["MONTHLY", "BIWEEKLY", "WEEKLY"] as const;
const PAYMENT_METHODS = ["BANK", "MOMO", "CASH"] as const;

function isEnum<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value);
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function ensureLeaveBalance(employeeId: string, year: number) {
  await prisma.leaveBalance.upsert({
    where: {
      employeeId_leaveType_year: {
        employeeId,
        leaveType: "ANNUAL",
        year,
      },
    },
    create: {
      employeeId,
      leaveType: "ANNUAL",
      year,
      entitled: DEFAULT_ANNUAL_LEAVE_DAYS,
    },
    update: {},
  });
}

export async function GET() {
  const { ctx, error } = await requireAdminApi("hr.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const staffWhere = await hrStaffUserWhere(ctx);

  const [staff, profiles] = await Promise.all([
    prisma.user.findMany({
      where: staffWhere,
      orderBy: { name: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        staffRole: true,
        staffCountry: true,
        activeStaff: true,
        staffAssignments: {
          select: {
            branchId: true,
            branch: { select: { id: true, name: true, country: true } },
          },
        },
      },
    }),
    prisma.employeeProfile.findMany({
      where: {
        user: staffWhere,
      },
      include: {
        leaveBalances: {
          where: { year: new Date().getUTCFullYear() },
        },
      },
    }),
  ]);

  const profileByUser = new Map(profiles.map((p) => [p.userId, p]));

  return NextResponse.json({
    employees: staff.map((u) => ({
      user: u,
      profile: profileByUser.get(u.id) || null,
    })),
  });
}

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("hr.write", {
    req,
    rateLimitKey: "hr-employees",
  });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "").trim();
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const staffWhere = await hrStaffUserWhere(ctx);
  const user = await prisma.user.findFirst({
    where: { id: userId, ...staffWhere },
    select: { id: true, email: true, name: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  const employmentType = String(body.employmentType || "FULL_TIME");
  const payFrequency = String(body.payFrequency || "MONTHLY");
  const paymentMethod = String(body.paymentMethod || "BANK");

  if (!isEnum(employmentType, EMPLOYMENT_TYPES)) {
    return NextResponse.json({ error: "Invalid employment type" }, { status: 400 });
  }
  if (!isEnum(payFrequency, PAY_FREQUENCIES)) {
    return NextResponse.json({ error: "Invalid pay frequency" }, { status: 400 });
  }
  if (!isEnum(paymentMethod, PAYMENT_METHODS)) {
    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
  }

  const hireDateRaw = body.hireDate ? String(body.hireDate) : null;
  const terminationDateRaw = body.terminationDate ? String(body.terminationDate) : null;

  const data = {
    employeeNumber: body.employeeNumber ? String(body.employeeNumber).trim() : null,
    employmentType: employmentType as EmploymentType,
    hireDate: hireDateRaw ? new Date(hireDateRaw) : null,
    terminationDate: terminationDateRaw ? new Date(terminationDateRaw) : null,
    jobTitle: body.jobTitle ? String(body.jobTitle).trim() : null,
    department: body.department ? String(body.department).trim() : null,
    ghanaCardId: body.ghanaCardId ? String(body.ghanaCardId).trim() : null,
    tin: body.tin ? String(body.tin).trim() : null,
    ssnitNumber: body.ssnitNumber ? String(body.ssnitNumber).trim() : null,
    paymentMethod: paymentMethod as EmployeePaymentMethod,
    bankName: body.bankName ? String(body.bankName).trim() : null,
    bankAccountNo: body.bankAccountNo ? String(body.bankAccountNo).trim() : null,
    bankBranch: body.bankBranch ? String(body.bankBranch).trim() : null,
    momoProvider: body.momoProvider ? String(body.momoProvider).trim() : null,
    momoNumber: body.momoNumber ? String(body.momoNumber).trim() : null,
    basicSalary: num(body.basicSalary),
    housingAllowance: num(body.housingAllowance),
    transportAllowance: num(body.transportAllowance),
    otherAllowances: num(body.otherAllowances),
    payFrequency: payFrequency as PayFrequency,
    notes: body.notes ? String(body.notes).trim() : null,
  };

  const profile = await prisma.employeeProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  await ensureLeaveBalance(profile.id, new Date().getUTCFullYear());

  await writeAuditLog({
    actorId: ctx.userId,
    action: "hr.employee.upsert",
    entityType: "EmployeeProfile",
    entityId: profile.id,
    summary: `Updated HR profile for ${user.email}`,
    req,
    metadata: { email: user.email, employeeNumber: profile.employeeNumber },
  });

  return NextResponse.json({ profile });
}
