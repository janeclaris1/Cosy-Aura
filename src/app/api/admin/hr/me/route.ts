import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { fetchMyHrSummary } from "@/lib/hr-self-service";
import { staffRoleLabel } from "@/lib/rbac";

export async function GET() {
  const { ctx, error } = await requireAdminApi("hr.self.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const summary = await fetchMyHrSummary(ctx.userId, ctx.staffCountry);
    if (!summary.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        ...summary.user,
        roleLabel: summary.user.staffRole
          ? staffRoleLabel(summary.user.staffRole)
          : ctx.isSuperAdmin
            ? "Super Admin"
            : "Admin",
      },
      profile: summary.profile,
      payslips: summary.payslips,
      upcoming: summary.upcoming,
      leaveRequests: summary.leaveRequests,
    });
  } catch (err) {
    console.error("[hr/me GET]", err);
    return NextResponse.json(
      { error: "Could not load your HR information." },
      { status: 503 }
    );
  }
}
