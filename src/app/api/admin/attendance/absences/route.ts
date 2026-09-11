import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { fetchMonthlyAbsenceReport } from "@/lib/attendance-absence-report";

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("attendance.read", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const result = await fetchMonthlyAbsenceReport(ctx, {
    branchId: searchParams.get("branchId") || undefined,
    month: searchParams.get("month") || undefined,
    fromMonth: searchParams.get("fromMonth") || undefined,
    toMonth: searchParams.get("toMonth") || undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    fromMonth: result.fromMonth,
    toMonth: result.toMonth,
    rows: result.rows,
    generatedAt: new Date().toISOString(),
  });
}
