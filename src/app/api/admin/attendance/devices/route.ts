import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAdminApi } from "@/lib/admin";
import { hashPasswordToken, writeAuditLog } from "@/lib/audit";
import { assertAttendanceBranchAccess } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("attendance.read", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "";
  if (!branchId) {
    return NextResponse.json({ error: "branchId is required" }, { status: 400 });
  }

  const access = await assertAttendanceBranchAccess(ctx, branchId);
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const devices = await prisma.attendanceDevice.findMany({
    where: { branchId },
    orderBy: { name: "asc" },
    include: {
      enrollments: {
        where: { active: true },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      _count: { select: { punches: true } },
    },
  });

  return NextResponse.json({
    devices: devices.map((d) => ({
      id: d.id,
      name: d.name,
      vendor: d.vendor,
      serialNumber: d.serialNumber,
      active: d.active,
      lastSyncAt: d.lastSyncAt?.toISOString() || null,
      punchCount: d._count.punches,
      webhookUrl: `${siteUrl()}/api/webhooks/attendance/${d.id}`,
      enrollments: d.enrollments.map((e) => ({
        id: e.id,
        deviceUserId: e.deviceUserId,
        userId: e.user.id,
        name: e.user.name || e.user.email,
        email: e.user.email,
      })),
    })),
  });
}

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("attendance.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const branchId = String(body.branchId || "");
  const name = String(body.name || "").trim();
  if (!branchId || !name) {
    return NextResponse.json(
      { error: "branchId and name are required" },
      { status: 400 }
    );
  }

  const access = await assertAttendanceBranchAccess(ctx, branchId);
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const webhookSecret = randomBytes(24).toString("hex");
  const device = await prisma.attendanceDevice.create({
    data: {
      branchId,
      name,
      vendor: body.vendor ? String(body.vendor).trim() : null,
      serialNumber: body.serialNumber ? String(body.serialNumber).trim() : null,
      webhookSecretHash: hashPasswordToken(webhookSecret),
    },
    select: { id: true, name: true },
  });

  await writeAuditLog({
    actorId: ctx.userId,
    action: "attendance.device_create",
    entityType: "AttendanceDevice",
    entityId: device.id,
    summary: `Registered attendance device “${device.name}” at ${access.branch.name}`,
    metadata: { branchId },
    req,
  });

  return NextResponse.json({
    device: { id: device.id, name: device.name },
    webhookUrl: `${siteUrl()}/api/webhooks/attendance/${device.id}`,
    webhookSecret,
  });
}
