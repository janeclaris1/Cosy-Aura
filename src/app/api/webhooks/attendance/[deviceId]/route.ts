import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPasswordToken } from "@/lib/audit";
import { recordAttendancePunch, resolveEnrollment } from "@/lib/attendance";
import type { AttendancePunchType } from "@prisma/client";

const PUNCH_TYPES: AttendancePunchType[] = ["CLOCK_IN", "CLOCK_OUT"];

function verifyDeviceSecret(
  deviceSecretHash: string,
  headerSecret: string | null
): boolean {
  if (!headerSecret?.trim()) return false;
  return hashPasswordToken(headerSecret.trim()) === deviceSecretHash;
}

function verifyGlobalSecret(headerSecret: string | null): boolean {
  const global = process.env.ATTENDANCE_WEBHOOK_SECRET?.trim();
  if (!global || !headerSecret?.trim()) return false;
  return headerSecret.trim() === global;
}

export async function POST(
  req: Request,
  { params }: { params: { deviceId: string } }
) {
  const device = await prisma.attendanceDevice.findFirst({
    where: { id: params.deviceId, active: true },
    select: { id: true, branchId: true, webhookSecretHash: true },
  });
  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  const headerSecret = req.headers.get("x-attendance-secret");
  const authorized =
    verifyDeviceSecret(device.webhookSecretHash, headerSecret) ||
    verifyGlobalSecret(headerSecret);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const deviceUserId = String(body.deviceUserId ?? body.userId ?? "").trim();
  if (!deviceUserId) {
    return NextResponse.json({ error: "deviceUserId is required" }, { status: 400 });
  }

  const enrollment = await resolveEnrollment(device.id, deviceUserId);
  if (!enrollment.ok) {
    return NextResponse.json({ error: enrollment.reason }, { status: 404 });
  }

  const rawType = String(body.punchType || body.type || "AUTO").toUpperCase();
  const punchType = PUNCH_TYPES.includes(rawType as AttendancePunchType)
    ? (rawType as AttendancePunchType)
    : "AUTO";

  const punchedAtRaw = body.punchedAt || body.timestamp || body.time;
  const punchedAt =
    punchedAtRaw && !Number.isNaN(Date.parse(String(punchedAtRaw)))
      ? new Date(String(punchedAtRaw))
      : undefined;

  const externalId = String(
    body.externalId ?? body.id ?? body.transactionId ?? ""
  ).trim() || `${device.id}:${deviceUserId}:${punchedAt?.toISOString() || Date.now()}`;

  const result = await recordAttendancePunch({
    userId: enrollment.userId,
    branchId: enrollment.branchId,
    punchType,
    source: "WEBHOOK",
    punchedAt,
    deviceId: device.id,
    externalId,
    note: body.note ? String(body.note) : null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    punchId: result.punchId,
    punchType: result.punchType,
  });
}
