import { NextResponse } from "next/server";
import type { AttendancePunchType } from "@prisma/client";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import {
  assertAttendanceBranchAccess,
  recordAttendancePunch,
} from "@/lib/attendance";

const PUNCH_TYPES: AttendancePunchType[] = ["CLOCK_IN", "CLOCK_OUT"];

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("attendance.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const branchId = String(body.branchId || "");
  const userId = String(body.userId || "");
  const rawType = String(body.punchType || "AUTO").toUpperCase();
  const punchType = PUNCH_TYPES.includes(rawType as AttendancePunchType)
    ? (rawType as AttendancePunchType)
    : "AUTO";

  if (!branchId || !userId) {
    return NextResponse.json(
      { error: "branchId and userId are required" },
      { status: 400 }
    );
  }

  const access = await assertAttendanceBranchAccess(ctx, branchId);
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const result = await recordAttendancePunch({
    userId,
    branchId,
    punchType,
    source: "MANUAL",
    note: body.note ? String(body.note) : null,
    createdById: ctx.userId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  await writeAuditLog({
    actorId: ctx.userId,
    action: "attendance.manual_punch",
    entityType: "AttendancePunch",
    entityId: result.punchId,
    summary: `Manual ${result.punchType} for staff at ${access.branch.name}`,
    metadata: { branchId, userId, punchType: result.punchType },
    req,
  });

  return NextResponse.json({
    ok: true,
    punchId: result.punchId,
    punchType: result.punchType,
  });
}
