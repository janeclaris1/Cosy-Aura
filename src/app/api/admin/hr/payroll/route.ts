import { NextResponse } from "next/server";
import type { PayRunStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { countryScopedBranchWhere, requireAdminApi, scopedBranchIds } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { defaultMonthKey, hrCountryFilter, monthToDateRange, parseMonthKey } from "@/lib/hr-scope";
import {
  generatePayRunLines,
  summarizePayRunLines,
} from "@/lib/payroll-engine";
import {
  sendPayslipEmailsForPayRun,
  type PayslipEmailLine,
} from "@/lib/payslip-email";
import { postPayRunJournal } from "@/lib/accounting-payroll-post";
import { enrichPayRunLines } from "@/lib/payroll-present";

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("payroll.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country") || hrCountryFilter(ctx) || "GH";

  const payRuns = await prisma.payRun.findMany({
    where: { country },
    orderBy: { periodLabel: "desc" },
    take: 24,
    include: {
      branch: { select: { id: true, name: true } },
      createdBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
      _count: { select: { lines: true } },
    },
  });

  return NextResponse.json({ payRuns, country });
}

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("payroll.write", {
    req,
    rateLimitKey: "hr-payroll",
  });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "create");

  if (action === "generate") {
    const payRunId = String(body.payRunId || "").trim();
    if (!payRunId) {
      return NextResponse.json({ error: "payRunId required" }, { status: 400 });
    }

    const payRun = await prisma.payRun.findUnique({ where: { id: payRunId } });
    if (!payRun) {
      return NextResponse.json({ error: "Pay run not found" }, { status: 404 });
    }
    if (payRun.status === "PAID" || payRun.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot regenerate a paid or cancelled pay run" },
        { status: 400 }
      );
    }

    const lines = await generatePayRunLines({
      ctx,
      country: payRun.country,
      periodLabel: payRun.periodLabel,
      branchId: payRun.branchId,
    });

    await prisma.$transaction(async (tx) => {
      await tx.payRunLine.deleteMany({ where: { payRunId } });
      if (lines.length) {
        await tx.payRunLine.createMany({
          data: lines.map((l) => ({
            payRunId,
            employeeId: l.employeeId,
            userId: l.userId,
            basicSalary: l.basicSalary,
            allowances: l.allowances,
            overtime: l.overtime,
            bonus: l.bonus,
            grossPay: l.grossPay,
            paye: l.paye,
            ssnitEmployee: l.ssnitEmployee,
            ssnitEmployer: l.ssnitEmployer,
            otherDeductions: l.otherDeductions,
            totalDeductions: l.totalDeductions,
            netPay: l.netPay,
            workingDays: l.workingDays,
            presentDays: l.presentDays,
            absentDays: l.absentDays,
            leaveDays: l.leaveDays,
            proRateFactor: l.proRateFactor,
          })),
        });
      }
      const totals = summarizePayRunLines(lines);
      await tx.payRun.update({
        where: { id: payRunId },
        data: { ...totals, status: "REVIEW" },
      });
    });

    await writeAuditLog({
      actorId: ctx.userId,
      action: "payroll.generate",
      entityType: "PayRun",
      entityId: payRunId,
      summary: `Generated ${lines.length} payslips`,
      req,
      metadata: { lines: lines.length },
    });

    const refreshed = await prisma.payRun.findUnique({
      where: { id: payRunId },
      include: {
        lines: {
          orderBy: { grossPay: "desc" },
        },
        branch: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      payRun: refreshed ? await enrichPayRunLines(refreshed) : null,
    });
  }

  if (action === "createEachBranch") {
    const periodLabel = parseMonthKey(body.periodLabel) || defaultMonthKey();
    const country = String(body.country || hrCountryFilter(ctx) || "GH").trim();
    const { periodStart, periodEnd } = monthToDateRange(periodLabel);

    const scope = scopedBranchIds(ctx);
    const branchWhere =
      scope === "all"
        ? { ...countryScopedBranchWhere(ctx), country, active: true }
        : { id: { in: scope }, country, active: true };

    const branches = await prisma.branch.findMany({
      where: branchWhere,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    if (!branches.length) {
      return NextResponse.json(
        { error: "No active branches found for this country." },
        { status: 400 }
      );
    }

    const created: Awaited<ReturnType<typeof prisma.payRun.create>>[] = [];
    const skipped: string[] = [];

    for (const branch of branches) {
      const existing = await prisma.payRun.findFirst({
        where: { country, periodLabel, branchId: branch.id },
      });
      if (existing) {
        skipped.push(branch.name);
        continue;
      }
      const payRun = await prisma.payRun.create({
        data: {
          country,
          branchId: branch.id,
          periodStart,
          periodEnd,
          periodLabel,
          status: "DRAFT",
          createdById: ctx.userId,
        },
        include: {
          branch: { select: { id: true, name: true } },
        },
      });
      created.push(payRun);
    }

    await writeAuditLog({
      actorId: ctx.userId,
      action: "payroll.create_each_branch",
      entityType: "PayRun",
      entityId: created[0]?.id || "batch",
      summary: `Created ${created.length} branch pay run(s) for ${periodLabel}`,
      req,
      metadata: { periodLabel, country, created: created.length, skipped: skipped.length },
    });

    return NextResponse.json({
      payRuns: created,
      createdCount: created.length,
      skippedBranches: skipped,
    });
  }

  const periodLabel = parseMonthKey(body.periodLabel) || defaultMonthKey();
  const country = String(body.country || hrCountryFilter(ctx) || "GH").trim();
  const branchId = body.branchId ? String(body.branchId) : null;
  const { periodStart, periodEnd } = monthToDateRange(periodLabel);

  const existing = await prisma.payRun.findFirst({
    where: { country, periodLabel, branchId },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A pay run already exists for this period", payRunId: existing.id },
      { status: 409 }
    );
  }

  const payRun = await prisma.payRun.create({
    data: {
      country,
      branchId,
      periodStart,
      periodEnd,
      periodLabel,
      status: "DRAFT",
      createdById: ctx.userId,
      notes: body.notes ? String(body.notes).trim() : null,
    },
    include: {
      branch: { select: { id: true, name: true } },
    },
  });

  await writeAuditLog({
    actorId: ctx.userId,
    action: "payroll.create",
    entityType: "PayRun",
    entityId: payRun.id,
    summary: `Created pay run ${periodLabel} (${country})`,
    req,
    metadata: { periodLabel, country, branchId },
  });

  return NextResponse.json({ payRun });
}

export async function PATCH(req: Request) {
  const { ctx, error } = await requireAdminApi("payroll.write", {
    req,
    rateLimitKey: "hr-payroll",
  });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  const status = String(body.status || "").trim() as PayRunStatus;

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const payRun = await prisma.payRun.findUnique({
    where: { id },
    include: { _count: { select: { lines: true } } },
  });
  if (!payRun) {
    return NextResponse.json({ error: "Pay run not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  if (status === "APPROVED") {
    if (!payRun._count.lines) {
      return NextResponse.json(
        { error: "Generate payslips before approving" },
        { status: 400 }
      );
    }
    updates.status = "APPROVED";
    updates.approvedById = ctx.userId;
    updates.approvedAt = new Date();
  } else if (status === "PAID") {
    if (payRun.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Pay run must be approved before marking paid" },
        { status: 400 }
      );
    }
    updates.status = "PAID";
    updates.paidAt = new Date();
  } else if (status === "CANCELLED") {
    updates.status = "CANCELLED";
  } else if (body.notes !== undefined) {
    updates.notes = body.notes ? String(body.notes).trim() : null;
  } else {
    return NextResponse.json({ error: "Unsupported update" }, { status: 400 });
  }

  const payRunUpdated = await prisma.$transaction(async (tx) => {
    const run = await tx.payRun.update({
      where: { id },
      data: updates,
      include: {
        branch: { select: { id: true, name: true } },
        lines: { orderBy: { grossPay: "desc" } },
      },
    });

    if (updates.status === "PAID" && run.country === "GH") {
      await postPayRunJournal(tx, id, ctx.userId);
    }

    return run;
  });

  const updated = await enrichPayRunLines(payRunUpdated);

  await writeAuditLog({
    actorId: ctx.userId,
    action: "payroll.update",
    entityType: "PayRun",
    entityId: id,
    summary: `Updated pay run (${String(updates.status || "notes")})`,
    req,
    metadata: { status: updates.status || "notes" },
  });

  if (updates.status === "PAID" && payRunUpdated.country === "GH") {
    await writeAuditLog({
      actorId: ctx.userId,
      action: "accounting.payroll_post",
      entityType: "PayRun",
      entityId: id,
      summary: `Posted payroll journal for ${payRunUpdated.periodLabel}`,
      req,
    });
  }

  let payslipEmails: { sent: number; failed: number; errors: string[] } | undefined;

  if (updates.status === "PAID" && updated.lines.length) {
    payslipEmails = await sendPayslipEmailsForPayRun({
      periodLabel: updated.periodLabel,
      country: updated.country,
      currency: updated.currency,
      branch: updated.branch,
      lines: updated.lines.map((line): PayslipEmailLine => {
        const enriched = line as typeof line & {
          staff?: { name: string | null; email: string } | null;
        };
        return {
          userId: line.userId,
          basicSalary: line.basicSalary,
          allowances: line.allowances,
          grossPay: line.grossPay,
          paye: line.paye,
          ssnitEmployee: line.ssnitEmployee,
          totalDeductions: line.totalDeductions,
          netPay: line.netPay,
          presentDays: line.presentDays,
          workingDays: line.workingDays,
          proRateFactor: line.proRateFactor,
          staff: enriched.staff
            ? { name: enriched.staff.name, email: enriched.staff.email }
            : null,
        };
      }),
    });

    await writeAuditLog({
      actorId: ctx.userId,
      action: "payroll.payslip_emails",
      entityType: "PayRun",
      entityId: id,
      summary: `Sent ${payslipEmails.sent} payslip email(s)${payslipEmails.failed ? `, ${payslipEmails.failed} failed` : ""}`,
      req,
      metadata: {
        sent: payslipEmails.sent,
        failed: payslipEmails.failed,
        errors: payslipEmails.errors.slice(0, 5),
      },
    });
  }

  return NextResponse.json({ payRun: updated, payslipEmails });
}
