import type { AdminContext } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { staffRoleNeedsCountry } from "@/lib/rbac";

/** Country filter for HR queries; undefined = all countries. */
export function hrCountryFilter(ctx: AdminContext): string | undefined {
  if (ctx.isGlobal || ctx.isSuperAdmin) return undefined;
  if (staffRoleNeedsCountry(ctx.staffRole) && ctx.staffCountry) {
    return ctx.staffCountry;
  }
  return undefined;
}

/** Branch IDs the admin may see for HR; "all" = unrestricted. */
export async function hrScopedBranchIds(
  ctx: AdminContext
): Promise<string[] | "all"> {
  if (ctx.isGlobal || ctx.isSuperAdmin) return "all";
  if (staffRoleNeedsCountry(ctx.staffRole) && ctx.staffCountry) {
    const branches = await prisma.branch.findMany({
      where: { country: ctx.staffCountry, active: true },
      select: { id: true },
    });
    return branches.map((b) => b.id);
  }
  if (ctx.branchIds.length) return ctx.branchIds;
  return [];
}

/** Prisma where clause for staff users visible in HR. */
export async function hrStaffUserWhere(ctx: AdminContext) {
  const country = hrCountryFilter(ctx);
  const branchScope = await hrScopedBranchIds(ctx);

  const where: Record<string, unknown> = {
    role: "ADMIN",
    activeStaff: true,
  };

  if (country) {
    where.staffCountry = country;
  }

  if (branchScope !== "all") {
    if (!branchScope.length) {
      where.id = "__none__";
    } else {
      where.staffAssignments = { some: { branchId: { in: branchScope } } };
    }
  }

  return where;
}

export function parseMonthKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

export function monthToDateRange(monthKey: string): {
  periodStart: Date;
  periodEnd: Date;
} {
  const [y, m] = monthKey.split("-").map(Number);
  const periodStart = new Date(Date.UTC(y, m - 1, 1));
  const periodEnd = new Date(Date.UTC(y, m, 0));
  return { periodStart, periodEnd };
}

export function defaultMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}
