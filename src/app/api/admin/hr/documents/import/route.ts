import { NextResponse } from "next/server";
import type { EmploymentType, EmployeePaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { hrStaffUserWhere } from "@/lib/hr-scope";
import { DEFAULT_ANNUAL_LEAVE_DAYS } from "@/lib/payroll-gh";
import { BULK_EMPLOYEE_IMPORT_COLUMNS } from "@/lib/hr-document-templates-default";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell.trim());
      if (row.some((v) => v.length > 0)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell.trim());
    if (row.some((v) => v.length > 0)) rows.push(row);
  }
  return rows;
}

function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("hr.write", {
    req,
    rateLimitKey: "hr-import",
  });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file required" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return NextResponse.json({ error: "CSV must include header and at least one row" }, { status: 400 });
  }

  const header = rows[0].map((h) => h.trim());
  const expected = [...BULK_EMPLOYEE_IMPORT_COLUMNS];
  if (header.join(",") !== expected.join(",")) {
    return NextResponse.json(
      {
        error: "Invalid CSV header. Download the latest import template and try again.",
        expected: expected.join(","),
      },
      { status: 400 }
    );
  }

  const staffWhere = await hrStaffUserWhere(ctx);
  const results: Array<{ email: string; ok: boolean; error?: string }> = [];

  for (const values of rows.slice(1)) {
    const record = Object.fromEntries(header.map((key, i) => [key, values[i] ?? ""]));
    const email = String(record.email || "")
      .trim()
      .toLowerCase();
    if (!email) {
      results.push({ email: "(blank)", ok: false, error: "Missing email" });
      continue;
    }

    try {
      const user = await prisma.user.findFirst({
        where: { email, ...staffWhere, role: "ADMIN" },
        select: { id: true, email: true },
      });
      if (!user) {
        results.push({
          email,
          ok: false,
          error: "Staff account not found — invite staff first",
        });
        continue;
      }

      if (record.name?.trim()) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            name: record.name.trim(),
            phone: record.phone?.trim() || undefined,
          },
        });
      }

      const hireDateRaw = record.hireDate?.trim();
      const profile = await prisma.employeeProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          employeeNumber: record.employeeNumber?.trim() || null,
          employmentType: (record.employmentType?.trim() ||
            "FULL_TIME") as EmploymentType,
          hireDate: hireDateRaw ? new Date(hireDateRaw) : null,
          jobTitle: record.jobTitle?.trim() || null,
          department: record.department?.trim() || null,
          ghanaCardId: record.ghanaCardId?.trim() || null,
          tin: record.tin?.trim() || null,
          ssnitNumber: record.ssnitNumber?.trim() || null,
          paymentMethod: (record.paymentMethod?.trim() || "BANK") as EmployeePaymentMethod,
          bankName: record.bankName?.trim() || null,
          bankAccountNo: record.bankAccountNo?.trim() || null,
          momoProvider: record.momoProvider?.trim() || null,
          momoNumber: record.momoNumber?.trim() || null,
          basicSalary: num(record.basicSalary),
          housingAllowance: num(record.housingAllowance),
          transportAllowance: num(record.transportAllowance),
          otherAllowances: num(record.otherAllowances),
        },
        update: {
          employeeNumber: record.employeeNumber?.trim() || null,
          employmentType: (record.employmentType?.trim() ||
            "FULL_TIME") as EmploymentType,
          hireDate: hireDateRaw ? new Date(hireDateRaw) : null,
          jobTitle: record.jobTitle?.trim() || null,
          department: record.department?.trim() || null,
          ghanaCardId: record.ghanaCardId?.trim() || null,
          tin: record.tin?.trim() || null,
          ssnitNumber: record.ssnitNumber?.trim() || null,
          paymentMethod: (record.paymentMethod?.trim() || "BANK") as EmployeePaymentMethod,
          bankName: record.bankName?.trim() || null,
          bankAccountNo: record.bankAccountNo?.trim() || null,
          momoProvider: record.momoProvider?.trim() || null,
          momoNumber: record.momoNumber?.trim() || null,
          basicSalary: num(record.basicSalary),
          housingAllowance: num(record.housingAllowance),
          transportAllowance: num(record.transportAllowance),
          otherAllowances: num(record.otherAllowances),
        },
      });

      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveType_year: {
            employeeId: profile.id,
            leaveType: "ANNUAL",
            year: new Date().getUTCFullYear(),
          },
        },
        create: {
          employeeId: profile.id,
          leaveType: "ANNUAL",
          year: new Date().getUTCFullYear(),
          entitled: DEFAULT_ANNUAL_LEAVE_DAYS,
        },
        update: {},
      });

      results.push({ email, ok: true });
    } catch (err) {
      results.push({
        email,
        ok: false,
        error: err instanceof Error ? err.message : "Import failed",
      });
    }
  }

  const imported = results.filter((r) => r.ok).length;
  await writeAuditLog({
    actorId: ctx.userId,
    action: "hr.employee.bulk_import",
    entityType: "EmployeeProfile",
    entityId: "bulk",
    summary: `Bulk employee import — ${imported}/${results.length} rows`,
    req,
    metadata: { imported, total: results.length },
  });

  return NextResponse.json({ imported, total: results.length, results });
}
