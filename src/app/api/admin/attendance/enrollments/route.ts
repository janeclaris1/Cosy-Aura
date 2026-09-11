import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { assertAttendanceBranchAccess } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("attendance.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const deviceId = String(body.deviceId || "");
  const userId = String(body.userId || "");
  const deviceUserId = String(body.deviceUserId || "").trim();

  if (!deviceId || !userId || !deviceUserId) {
    return NextResponse.json(
      { error: "deviceId, userId, and deviceUserId are required" },
      { status: 400 }
    );
  }

  const device = await prisma.attendanceDevice.findUnique({
    where: { id: deviceId },
    select: { id: true, branchId: true, name: true },
  });
  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  const access = await assertAttendanceBranchAccess(ctx, device.branchId);
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const assigned = await prisma.staffAssignment.findFirst({
    where: { branchId: device.branchId, userId },
    select: { id: true },
  });
  if (!assigned) {
    return NextResponse.json(
      { error: "Staff member is not assigned to this branch" },
      { status: 400 }
    );
  }

  const enrollment = await prisma.attendanceEnrollment.upsert({
    where: {
      userId_deviceId: { userId, deviceId },
    },
    create: {
      userId,
      deviceId,
      deviceUserId,
      active: true,
    },
    update: {
      deviceUserId,
      active: true,
    },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  await writeAuditLog({
    actorId: ctx.userId,
    action: "attendance.enrollment_upsert",
    entityType: "AttendanceEnrollment",
    entityId: enrollment.id,
    summary: `Mapped device user ${deviceUserId} → ${enrollment.user.name || enrollment.user.email}`,
    metadata: { deviceId, userId, deviceUserId },
    req,
  });

  return NextResponse.json({
    enrollment: {
      id: enrollment.id,
      deviceUserId: enrollment.deviceUserId,
      userId: enrollment.userId,
      name: enrollment.user.name || enrollment.user.email,
    },
  });
}
