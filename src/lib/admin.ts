import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { StaffRole } from "@prisma/client";
import { authOptions } from "./auth";
import { isAdminMutationCsrfBlocked } from "./admin-csrf";
import { isAdminRateLimitedAsync } from "./admin-rate-limit";
import { prisma } from "./prisma";
import {
  canAccessNavItem,
  hasAnyPermission,
  hasFullAdminAccess,
  hasPermission,
  resolvePermissions,
  staffRoleNeedsCountry,
  type Permission,
} from "./rbac";

export type AdminContext = {
  userId: string;
  email: string;
  role: string;
  staffRole: StaffRole | null;
  staffCountry: string | null;
  branchIds: string[];
  permissions: Permission[];
  isSuperAdmin: boolean;
  /** True when user may see all branches/countries. */
  isGlobal: boolean;
};

export async function getAdminContext(): Promise<AdminContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      staffRole: true,
      staffCountry: true,
      activeStaff: true,
      staffAssignments: { select: { branchId: true } },
    },
  });
  if (!user || user.role !== "ADMIN") return null;
  if (user.activeStaff === false && !hasFullAdminAccess(user)) return null;

  const permissions = resolvePermissions(user);
  const isSuper = hasFullAdminAccess(user);
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    staffRole: user.staffRole,
    staffCountry: user.staffCountry,
    branchIds: user.staffAssignments.map((a) => a.branchId),
    permissions,
    isSuperAdmin: isSuper,
    isGlobal: isSuper || user.staffRole === "CONTENT" || user.staffRole === "SUPPORT",
  };
}

export { canAccessNavItem, hasAnyPermission };

export async function requireAdminApi(
  permission?: Permission | Permission[],
  options?: { req?: Request; rateLimitKey?: string }
): Promise<
  | { ctx: AdminContext; error: null }
  | { ctx: null; error: NextResponse }
> {
  if (options?.req) {
    if (isAdminMutationCsrfBlocked(options.req)) {
      return {
        ctx: null,
        error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }
    if (
      await isAdminRateLimitedAsync(
        options.req,
        options.rateLimitKey || "admin"
      )
    ) {
      return {
        ctx: null,
        error: NextResponse.json(
          { error: "Too many requests. Please wait a moment and try again." },
          { status: 429 }
        ),
      };
    }
  }

  const ctx = await getAdminContext();
  if (!ctx) {
    return {
      ctx: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (permission && !hasPermission(ctx.permissions, permission)) {
    return {
      ctx: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ctx, error: null };
}

function isLegacyAdmin(ctx: AdminContext): boolean {
  return ctx.role === "ADMIN" && !ctx.staffRole;
}

/** Branch IDs this admin may act on (empty = none unless global). */
export function scopedBranchIds(ctx: AdminContext): string[] | "all" {
  if (ctx.isGlobal || ctx.isSuperAdmin) return "all";
  if (staffRoleNeedsCountry(ctx.staffRole)) return "all"; // filtered by country in queries
  if (isLegacyAdmin(ctx)) return "all";
  return ctx.branchIds;
}

/** Prisma branch filter for country-scoped roles (HR, accountant, country manager). */
export function countryScopedBranchWhere(
  ctx: AdminContext
): { country: string } | Record<string, never> {
  if (staffRoleNeedsCountry(ctx.staffRole) && ctx.staffCountry) {
    return { country: ctx.staffCountry };
  }
  return {};
}

export function orderBranchWhere(ctx: AdminContext): Record<string, unknown> | undefined {
  if (ctx.isGlobal || ctx.isSuperAdmin) return undefined;
  if (isLegacyAdmin(ctx)) return undefined;
  if (ctx.staffRole === "COUNTRY_MANAGER" && ctx.staffCountry) {
    return {
      OR: [
        { shippingCountry: ctx.staffCountry },
        { fulfillmentBranch: { country: ctx.staffCountry } },
      ],
    };
  }
  if (ctx.branchIds.length) {
    return { fulfillmentBranchId: { in: ctx.branchIds } };
  }
  return { fulfillmentBranchId: "__none__" };
}
