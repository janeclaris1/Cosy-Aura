import "server-only";

import { prisma } from "@/lib/prisma";
import { staffRoleLabel } from "@/lib/rbac";

export type PayslipDocument = {
  payRun: {
    id: string;
    periodLabel: string;
    country: string;
    currency: string;
    status: string;
    paidAt: Date | null;
    branch: { name: string } | null;
  };
  line: {
    id: string;
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
    presentDays: number;
    workingDays: number;
    leaveDays: number;
    proRateFactor: number;
  };
  employee: {
    userId: string;
    name: string;
    email: string;
    employeeNumber: string | null;
    jobTitle: string | null;
    department: string | null;
    branches: string[];
    ghanaCardId: string | null;
    tin: string | null;
    ssnitNumber: string | null;
  };
  company: {
    name: string;
    addressLine: string;
    phone: string | null;
    officialNumber: string | null;
    officialNumberLabel: string;
  };
  payment: {
    method: string;
    bankName: string | null;
    bankAccountNo: string | null;
    momoProvider: string | null;
    momoNumber: string | null;
  };
};

export const PAYSLIP_COMPANY = {
  name: process.env.COMPANY_LEGAL_NAME?.trim() || "COSY AURA LTD",
  addressLine:
    process.env.COMPANY_ADDRESS?.trim() ||
    "15 Odaw Street, Kokomlemle, Accra, Ghana",
  phone:
    process.env.COMPANY_PHONE?.trim() ||
    process.env.DAWUROBO_PICKUP_PHONE?.trim() ||
    null,
};

/** Official company telephone for payslip letterhead. */
export function resolveCompanyPhone(
  branch: { phone: string | null; country: string } | null
): string | null {
  const fromEnv = process.env.COMPANY_PHONE?.trim();
  if (fromEnv) return fromEnv;

  const branchPhone = branch?.phone?.trim();
  if (branchPhone) return branchPhone;

  const country = String(branch?.country || "GH")
    .trim()
    .toUpperCase();
  if (country === "GH") {
    return process.env.DAWUROBO_PICKUP_PHONE?.trim() || null;
  }

  return null;
}

/** Employer tax / registration number shown on payslips (country-specific). */
export function companyOfficialNumber(country: string): {
  label: string;
  value: string | null;
} {
  const code = String(country || "GH")
    .trim()
    .toUpperCase();
  const fallback =
    process.env.COMPANY_TIN?.trim() ||
    process.env.COMPANY_OFFICIAL_NUMBER?.trim() ||
    null;

  if (code === "GH") {
    return {
      label: "TIN",
      value: process.env.COMPANY_TIN_GH?.trim() || fallback,
    };
  }
  if (code === "CM") {
    return {
      label: "NIF",
      value: process.env.COMPANY_TIN_CM?.trim() || fallback,
    };
  }

  return {
    label: "Registration No.",
    value:
      process.env[`COMPANY_TIN_${code}`]?.trim() ||
      process.env.COMPANY_REGISTRATION_NO?.trim() ||
      fallback,
  };
}

type BranchInfo = {
  name: string;
  address: string | null;
  city: string | null;
  country: string;
  phone: string | null;
} | null;

type UserInfo = {
  id: string;
  name: string | null;
  email: string;
  employeeProfile: {
    employeeNumber: string | null;
    jobTitle: string | null;
    department: string | null;
    paymentMethod: string;
    bankName: string | null;
    bankAccountNo: string | null;
    momoProvider: string | null;
    momoNumber: string | null;
  } | null;
  staffAssignments: Array<{
    branch: { name: string; country: string };
  }>;
};

function companyFromBranch(branch: BranchInfo, payRunCountry: string) {
  const official = companyOfficialNumber(branch?.country || payRunCountry);
  const addressLine = branch
    ? [branch.address, branch.city, branch.country].filter(Boolean).join(", ")
    : PAYSLIP_COMPANY.addressLine;

  return {
    name: PAYSLIP_COMPANY.name,
    addressLine: addressLine || PAYSLIP_COMPANY.addressLine,
    phone: resolveCompanyPhone(branch),
    officialNumber: official.value,
    officialNumberLabel: official.label,
  };
}

function mapPayslipDocument(
  payRun: {
    id: string;
    periodLabel: string;
    country: string;
    currency: string;
    status: string;
    paidAt: Date | null;
    branch: BranchInfo;
  },
  line: {
    id: string;
    userId: string;
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
    presentDays: number;
    workingDays: number;
    leaveDays: number;
    proRateFactor: number;
  },
  user: UserInfo
): PayslipDocument {
  const profile = user.employeeProfile;
  return {
    payRun: {
      id: payRun.id,
      periodLabel: payRun.periodLabel,
      country: payRun.country,
      currency: payRun.currency,
      status: payRun.status,
      paidAt: payRun.paidAt,
      branch: payRun.branch ? { name: payRun.branch.name } : null,
    },
    line: {
      id: line.id,
      basicSalary: line.basicSalary,
      allowances: line.allowances,
      overtime: line.overtime,
      bonus: line.bonus,
      grossPay: line.grossPay,
      paye: line.paye,
      ssnitEmployee: line.ssnitEmployee,
      ssnitEmployer: line.ssnitEmployer,
      otherDeductions: line.otherDeductions,
      totalDeductions: line.totalDeductions,
      netPay: line.netPay,
      presentDays: line.presentDays,
      workingDays: line.workingDays,
      leaveDays: line.leaveDays,
      proRateFactor: line.proRateFactor,
    },
    employee: {
      userId: user.id,
      name: user.name || user.email,
      email: user.email,
      employeeNumber: profile?.employeeNumber ?? null,
      jobTitle: profile?.jobTitle ?? null,
      department: profile?.department ?? null,
      branches: user.staffAssignments
        .filter((a) => a.branch.country === payRun.country)
        .map((a) => a.branch.name),
      ghanaCardId: profile?.ghanaCardId ?? null,
      tin: profile?.tin ?? null,
      ssnitNumber: profile?.ssnitNumber ?? null,
    },
    company: companyFromBranch(payRun.branch, payRun.country),
    payment: {
      method: profile?.paymentMethod ?? "BANK",
      bankName: profile?.bankName ?? null,
      bankAccountNo: profile?.bankAccountNo ?? null,
      momoProvider: profile?.momoProvider ?? null,
      momoNumber: profile?.momoNumber ?? null,
    },
  };
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  employeeProfile: {
    select: {
      employeeNumber: true,
      jobTitle: true,
      department: true,
      ghanaCardId: true,
      tin: true,
      ssnitNumber: true,
      paymentMethod: true,
      bankName: true,
      bankAccountNo: true,
      momoProvider: true,
      momoNumber: true,
    },
  },
  staffAssignments: {
    select: {
      branch: { select: { name: true, country: true } },
    },
  },
} as const;

const branchSelect = {
  name: true,
  address: true,
  city: true,
  country: true,
  phone: true,
} as const;

export type PayslipSignatory = {
  name: string;
  email: string;
  title: string;
  signedAt: Date;
};

export function formatPayslipPeriod(periodLabel: string): string {
  const [y, m] = periodLabel.split("-").map(Number);
  if (!y || !m) return periodLabel;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatPayslipSignedDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Accountant who authorises the payslip — approver when paid/approved, else current user. */
export async function resolvePayslipAccountant(
  payRunId: string,
  currentUser?: { userId: string; email: string }
): Promise<PayslipSignatory> {
  const payRun = await prisma.payRun.findUnique({
    where: { id: payRunId },
    select: {
      approvedAt: true,
      paidAt: true,
      approvedBy: {
        select: { name: true, email: true, staffRole: true },
      },
    },
  });

  const signedAt = payRun?.paidAt || payRun?.approvedAt || new Date();

  if (payRun?.approvedBy) {
    return {
      name: payRun.approvedBy.name || payRun.approvedBy.email,
      email: payRun.approvedBy.email,
      title: staffRoleLabel(payRun.approvedBy.staffRole) || "Accountant",
      signedAt,
    };
  }

  if (currentUser) {
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { name: true, email: true, staffRole: true },
    });
    return {
      name: user?.name || currentUser.email,
      email: user?.email || currentUser.email,
      title: staffRoleLabel(user?.staffRole) || "Accountant",
      signedAt: new Date(),
    };
  }

  return {
    name: "Cosy Aura Payroll",
    email: "",
    title: "Accountant",
    signedAt: new Date(),
  };
}

export async function fetchPayslipDocument(
  payRunId: string,
  lineId: string
): Promise<PayslipDocument | null> {
  const payRun = await prisma.payRun.findUnique({
    where: { id: payRunId },
    include: {
      branch: { select: branchSelect },
      lines: {
        where: { id: lineId },
        take: 1,
      },
    },
  });

  const line = payRun?.lines[0];
  if (!payRun || !line) return null;

  const user = await prisma.user.findUnique({
    where: { id: line.userId },
    select: userSelect,
  });

  if (!user) return null;

  return mapPayslipDocument(payRun, line, user);
}

export async function fetchAllPayslipDocuments(
  payRunId: string
): Promise<PayslipDocument[]> {
  const payRun = await prisma.payRun.findUnique({
    where: { id: payRunId },
    include: {
      branch: { select: branchSelect },
      lines: { orderBy: { grossPay: "desc" } },
    },
  });

  if (!payRun || !payRun.lines.length) return [];

  const userIds = [...new Set(payRun.lines.map((l) => l.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: userSelect,
  });

  const userMap = new Map(users.map((u) => [u.id, u]));
  const docs: PayslipDocument[] = [];

  for (const line of payRun.lines) {
    const user = userMap.get(line.userId);
    if (!user) continue;
    docs.push(mapPayslipDocument(payRun, line, user));
  }

  return docs;
}
