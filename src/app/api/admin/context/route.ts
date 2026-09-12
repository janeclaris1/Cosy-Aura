import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { countryScopedBranchWhere, requireAdminApi, scopedBranchIds } from "@/lib/admin";

/** Branches the current admin can “act as”, for the header switcher. */
export async function GET() {
  const { ctx, error } = await requireAdminApi("dashboard.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = scopedBranchIds(ctx);
  const where =
    scope === "all"
      ? { ...countryScopedBranchWhere(ctx), active: true }
      : { id: { in: scope }, active: true };

  const branches = await prisma.branch.findMany({
    where,
    orderBy: [{ country: "asc" }, { name: "asc" }],
    select: { id: true, name: true, country: true, isDefault: true },
  });

  return NextResponse.json({
    branches,
    staffRole: ctx.staffRole,
    staffCountry: ctx.staffCountry,
    isSuperAdmin: ctx.isSuperAdmin,
    permissions: ctx.permissions,
  });
}
