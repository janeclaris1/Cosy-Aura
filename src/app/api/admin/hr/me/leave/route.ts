import { NextResponse } from "next/server";
import type { LeaveType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { DEFAULT_ANNUAL_LEAVE_DAYS } from "@/lib/payroll-gh";
import { isEmployeeLeaveType, workingDaysBetween } from "@/lib/leave-utils";

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function ensureEmployeeProfile(userId: string) {
  const existing = await prisma.employeeProfile.findUnique({
    where: { userId },
    include: {
      leaveBalances: {
        where: { year: new Date().getUTCFullYear(), leaveType: "ANNUAL" },
      },
    },
  });
  if (existing) return existing;

  const profile = await prisma.employeeProfile.create({
    data: { userId },
    include: {
      leaveBalances: {
        where: { year: new Date().getUTCFullYear(), leaveType: "ANNUAL" },
      },
    },
  });

  await prisma.leaveBalance.create({
    data: {
      employeeId: profile.id,
      leaveType: "ANNUAL",
      year: new Date().getUTCFullYear(),
      entitled: DEFAULT_ANNUAL_LEAVE_DAYS,
    },
  });

  return prisma.employeeProfile.findUniqueOrThrow({
    where: { id: profile.id },
    include: {
      leaveBalances: {
        where: { year: new Date().getUTCFullYear(), leaveType: "ANNUAL" },
      },
    },
  });
}

/** Employee submits a leave request for themselves. */
export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("hr.self.read", {
    req,
    rateLimitKey: "hr-me-leave",
  });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const leaveType = String(body.leaveType || "ANNUAL");
  const startDateStr = body.startDate ? String(body.startDate).slice(0, 10) : "";
  const endDateStr = body.endDate ? String(body.endDate).slice(0, 10) : "";
  const reason = body.reason ? String(body.reason).trim() : null;

  if (!startDateStr || !endDateStr) {
    return NextResponse.json(
      { error: "Start and end dates are required." },
      { status: 400 }
    );
  }
  if (!isEmployeeLeaveType(leaveType)) {
    return NextResponse.json({ error: "Invalid leave type." }, { status: 400 });
  }

  const startDate = new Date(`${startDateStr}T12:00:00`);
  const endDate = new Date(`${endDateStr}T12:00:00`);
  if (endDate < startDate) {
    return NextResponse.json(
      { error: "End date must be on or after start date." },
      { status: 400 }
    );
  }

  const days = num(body.days, 0) || workingDaysBetween(startDateStr, endDateStr);
  if (days <= 0) {
    return NextResponse.json({ error: "Leave must be at least half a day." }, { status: 400 });
  }

  const profile = await ensureEmployeeProfile(ctx.userId);

  if (leaveType === "ANNUAL") {
    const balance = profile.leaveBalances[0];
    const remaining = balance
      ? Math.max(0, balance.entitled - balance.used)
      : DEFAULT_ANNUAL_LEAVE_DAYS;
    if (days > remaining) {
      return NextResponse.json(
        {
          error: `Insufficient annual leave. You have ${remaining} day${remaining === 1 ? "" : "s"} remaining.`,
        },
        { status: 400 }
      );
    }
  }

  const overlapping = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: profile.id,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });
  if (overlapping) {
    return NextResponse.json(
      { error: "You already have leave booked for overlapping dates." },
      { status: 409 }
    );
  }

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId: profile.id,
      leaveType: leaveType as LeaveType,
      startDate,
      endDate,
      days,
      reason,
      status: "PENDING",
    },
  });

  await writeAuditLog({
    actorId: ctx.userId,
    action: "hr.leave.self_request",
    entityType: "LeaveRequest",
    entityId: request.id,
    summary: `Self-service ${leaveType} leave request (${days} days)`,
    req,
    metadata: { leaveType, days, startDate: startDateStr, endDate: endDateStr },
  });

  return NextResponse.json({ request }, { status: 201 });
}

/** Cancel own pending leave request. */
export async function PATCH(req: Request) {
  const { ctx, error } = await requireAdminApi("hr.self.read", {
    req,
    rateLimitKey: "hr-me-leave",
  });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "Request id required." }, { status: 400 });
  }

  const profile = await prisma.employeeProfile.findUnique({
    where: { userId: ctx.userId },
  });
  if (!profile) {
    return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
  }

  const existing = await prisma.leaveRequest.findFirst({
    where: { id, employeeId: profile.id, status: "PENDING" },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Only pending requests can be cancelled." },
      { status: 400 }
    );
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  await writeAuditLog({
    actorId: ctx.userId,
    action: "hr.leave.self_cancel",
    entityType: "LeaveRequest",
    entityId: id,
    summary: "Cancelled own pending leave request",
    req,
  });

  return NextResponse.json({ request: updated });
}
