import type { EmployeeProfile, StaffRole, User } from "@prisma/client";
import { employmentTypeLabel } from "@/lib/payroll-gh";
import { staffRoleLabel } from "@/lib/rbac";
import { formatPrice } from "@/lib/utils";
import { hrCompanyLetterhead } from "@/lib/hr-company-letterhead";

export type HrMergeContext = {
  employee: EmployeeProfile;
  user: Pick<User, "name" | "email" | "phone" | "staffRole" | "staffCountry">;
  branches: string[];
  country: string;
  extra?: Record<string, string>;
};

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function buildHrMergeFields(ctx: HrMergeContext): Record<string, string> {
  const { employee, user, branches, country, extra } = ctx;
  const company = hrCompanyLetterhead(country);
  const totalAllowances =
    employee.housingAllowance + employee.transportAllowance + employee.otherAllowances;
  const grossMonthly = employee.basicSalary + totalAllowances;

  return {
    "company.name": company.name,
    "company.address": company.addressLine,
    "company.phone": company.phone || "—",
    "company.email": company.email || "—",
    "company.tin": company.tin || "—",
    "company.ssnitEmployerNo": company.ssnitEmployerNo || "—",
    "company.registrationNo": company.registrationNo || "—",
    "company.footer": company.footerWording,
    "employee.name": user.name?.trim() || user.email,
    "employee.email": user.email,
    "employee.phone": user.phone?.trim() || "—",
    "employee.number": employee.employeeNumber?.trim() || "—",
    "employee.jobTitle": employee.jobTitle?.trim() || "—",
    "employee.department": employee.department?.trim() || "—",
    "employee.role": user.staffRole ? staffRoleLabel(user.staffRole as StaffRole) : "—",
    "employee.employmentType": employmentTypeLabel(employee.employmentType),
    "employee.hireDate": formatDate(employee.hireDate),
    "employee.terminationDate": formatDate(employee.terminationDate),
    "employee.branches": branches.length ? branches.join(", ") : "—",
    "employee.ghanaCardId": employee.ghanaCardId?.trim() || "—",
    "employee.tin": employee.tin?.trim() || "—",
    "employee.ssnitNumber": employee.ssnitNumber?.trim() || "—",
    "employee.basicSalary": formatPrice(employee.basicSalary, "GHS"),
    "employee.allowances": formatPrice(totalAllowances, "GHS"),
    "employee.grossMonthly": formatPrice(grossMonthly, "GHS"),
    "document.date": formatDate(new Date()),
    "document.year": String(new Date().getUTCFullYear()),
    ...(extra || {}),
  };
}

export function renderHrTemplate(
  body: string,
  fields: Record<string, string>
): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key: string) => {
    return fields[key] ?? "";
  });
}

/** Preview / dry-run merge fields when no employee is selected. */
export function sampleHrMergeFields(country = "GH"): Record<string, string> {
  const now = new Date();
  const company = hrCompanyLetterhead(country);
  return {
    "company.name": company.name,
    "company.address": company.addressLine,
    "company.phone": company.phone || "+233 (0) 3024584837",
    "company.email": company.email || "info@cosyaura.com",
    "company.tin": company.tin || "C0000000000",
    "company.ssnitEmployerNo": company.ssnitEmployerNo || "P0000000000",
    "company.registrationNo": company.registrationNo || "CS000000000",
    "company.footer": company.footerWording,
    "employee.name": "Ama Mensah",
    "employee.email": "staff@cosyaura.com",
    "employee.phone": "+233500000000",
    "employee.number": "EMP-001",
    "employee.jobTitle": "Sales Associate",
    "employee.department": "Retail",
    "employee.role": "Fulfilment",
    "employee.employmentType": "Full time",
    "employee.hireDate": formatDate(now),
    "employee.terminationDate": "—",
    "employee.branches": "Accra Showroom",
    "employee.ghanaCardId": "GHA-000000000-0",
    "employee.tin": "C0000000000",
    "employee.ssnitNumber": "C0000000000",
    "employee.basicSalary": formatPrice(2500, "GHS"),
    "employee.allowances": formatPrice(350, "GHS"),
    "employee.grossMonthly": formatPrice(2850, "GHS"),
    "document.date": formatDate(now),
    "document.year": String(now.getUTCFullYear()),
  };
}

export const HR_MERGE_FIELD_KEYS = [
  "company.name",
  "company.address",
  "company.phone",
  "company.email",
  "company.tin",
  "company.ssnitEmployerNo",
  "company.registrationNo",
  "employee.name",
  "employee.email",
  "employee.phone",
  "employee.number",
  "employee.jobTitle",
  "employee.department",
  "employee.role",
  "employee.employmentType",
  "employee.hireDate",
  "employee.branches",
  "employee.basicSalary",
  "employee.grossMonthly",
  "document.date",
  "document.year",
] as const;
