import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import {
  assertAttendanceBranchAccess,
  branchDayBounds,
  branchDayKey,
  getTodayAttendance,
} from "@/lib/attendance";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("attendance.read", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "";
  const dayKey = searchParams.get("day") || undefined;

  if (!branchId) {
    return NextResponse.json({ error: "branchId is required" }, { status: 400 });
  }

  const access = await assertAttendanceBranchAccess(ctx, branchId);
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const today = await getTodayAttendance(branchId, dayKey);
  const { start, end } = branchDayBounds(today.dayKey, today.timezone);
  const isToday = today.dayKey === branchDayKey(new Date(), today.timezone);

  const recent = await prisma.attendancePunch.findMany({
    where: {
      branchId,
      punchedAt: { gte: start, lte: end },
    },
    orderBy: { punchedAt: "desc" },
    take: 50,
    include: {
      user: { select: { name: true, email: true, image: true } },
      device: { select: { name: true } },
    },
  });

  return NextResponse.json({
    branch: access.branch,
    canWrite: ctx.permissions.includes("attendance.write"),
    isToday,
    ...today,
    recent: recent.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.user.name || p.user.email,
      image: p.user.image,
      punchType: p.punchType,
      source: p.source,
      punchedAt: p.punchedAt.toISOString(),
      deviceName: p.device?.name || null,
      note: p.note,
    })),
  });
}
