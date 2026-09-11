import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { fetchAttendanceReport } from "@/lib/attendance-report";

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("attendance.read", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const result = await fetchAttendanceReport(ctx, { branchId, from, to });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    fromDay: result.fromDay,
    toDay: result.toDay,
    rows: result.rows,
    summary: result.summary,
    generatedAt: new Date().toISOString(),
  });
}
