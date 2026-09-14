import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { resolveCommissionEmployeeByNumber } from "@/lib/staff-commission";

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("pos.read", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employeeNumber = new URL(req.url).searchParams.get("employeeNumber") || "";
  if (!employeeNumber.trim()) {
    return NextResponse.json({ error: "employeeNumber is required" }, { status: 400 });
  }

  const resolved = await resolveCommissionEmployeeByNumber(employeeNumber);
  if (!resolved.ok) {
    return NextResponse.json({ found: false, message: resolved.reason });
  }

  return NextResponse.json({
    found: true,
    name: resolved.name,
    employeeNumber: resolved.employeeNumber,
    message: resolved.name,
  });
}
