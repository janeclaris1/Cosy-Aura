import { NextResponse } from "next/server";
import type { LeaveStatus, LeaveType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { hrStaffUserWhere } from "@/lib/hr-scope";

const LEAVE_TYPES = ["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "UNPAID", "COMPASSIONATE"] as const;
const LEAVE_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;

function isEnum<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value);
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("hr.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const staffWhere = await hrStaffUserWhere(ctx);

  const requests = await prisma.leaveRequest.findMany({
    where: {
      employee: { user: staffWhere },
      ...(status && isEnum(status, LEAVE_STATUSES)
        ? { status: status as LeaveStatus }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      employee: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          leaveBalances: {
            where: { year: new Date().getUTCFullYear(), leaveType: "ANNUAL" },
          },
        },
      },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ requests });
}

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("hr.write", {
    req,
    rateLimitKey: "hr-leave",
  });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const employeeId = String(body.employeeId || "").trim();
  const leaveType = String(body.leaveType || "ANNUAL");
  const startDate = body.startDate ? new Date(String(body.startDate)) : null;
  const endDate = body.endDate ? new Date(String(body.endDate)) : null;
  const days = num(body.days, 0);

  if (!employeeId || !startDate || !endDate || days <= 0) {
    return NextResponse.json(
      { error: "employeeId, startDate, endDate, and days are required" },
      { status: 400 }
    );
  }
  if (!isEnum(leaveType, LEAVE_TYPES)) {
    return NextResponse.json({ error: "Invalid leave type" }, { status: 400 });
  }

  const staffWhere = await hrStaffUserWhere(ctx);
  const employee = await prisma.employeeProfile.findFirst({
    where: { id: employeeId, user: staffWhere },
    select: { id: true, userId: true },
  });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId,
      leaveType: leaveType as LeaveType,
      startDate,
      endDate,
      days,
      reason: body.reason ? String(body.reason).trim() : null,
      status: "PENDING",
    },
  });

  await writeAuditLog({
    actorId: ctx.userId,
    action: "hr.leave.create",
    entityType: "LeaveRequest",
    entityId: request.id,
    summary: `Created ${leaveType} leave request (${days} days)`,
    req,
    metadata: { employeeId, leaveType, days },
  });

  return NextResponse.json({ request });
}

export async function PATCH(req: Request) {
  const { ctx, error } = await requireAdminApi("hr.write", {
    req,
    rateLimitKey: "hr-leave",
  });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  const status = String(body.status || "").trim();

  if (!id || !isEnum(status, LEAVE_STATUSES)) {
    return NextResponse.json({ error: "id and valid status required" }, { status: 400 });
  }

  const staffWhere = await hrStaffUserWhere(ctx);
  const existing = await prisma.leaveRequest.findFirst({
    where: { id, employee: { user: staffWhere } },
    include: { employee: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: status as LeaveStatus,
      reviewedById: ctx.userId,
      reviewedAt: new Date(),
      reviewNote: body.reviewNote ? String(body.reviewNote).trim() : null,
    },
  });

  if (status === "APPROVED" && existing.status !== "APPROVED" && existing.leaveType === "ANNUAL") {
    const year = new Date(existing.startDate).getUTCFullYear();
    await prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveType_year: {
          employeeId: existing.employeeId,
          leaveType: "ANNUAL",
          year,
        },
      },
      create: {
        employeeId: existing.employeeId,
        leaveType: "ANNUAL",
        year,
        entitled: 15,
        used: existing.days,
      },
      update: {
        used: { increment: existing.days },
      },
    });
  }

  await writeAuditLog({
    actorId: ctx.userId,
    action: "hr.leave.review",
    entityType: "LeaveRequest",
    entityId: id,
    summary: `Leave request ${status.toLowerCase()}`,
    req,
    metadata: { status },
  });

  return NextResponse.json({ request: updated });
}
