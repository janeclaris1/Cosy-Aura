import type { Prisma } from "@prisma/client";
import type { AdminContext } from "@/lib/admin";
import { staffRoleNeedsCountry } from "@/lib/rbac";

/** Prisma filter so branch/country admins only see audit rows from their scope. */
export function auditLogWhere(ctx: AdminContext): Prisma.AuditLogWhereInput {
  if (ctx.isGlobal || ctx.isSuperAdmin) return {};

  if (ctx.staffRole === "FULFILMENT") {
    return { actorId: ctx.userId };
  }

  if (staffRoleNeedsCountry(ctx.staffRole) && ctx.staffCountry) {
    return {
      actor: {
        OR: [
          { staffCountry: ctx.staffCountry },
          {
            staffAssignments: {
              some: { branch: { country: ctx.staffCountry } },
            },
          },
        ],
      },
    };
  }

  if (ctx.branchIds.length) {
    return {
      OR: [
        { actorId: ctx.userId },
        {
          actor: {
            staffAssignments: { some: { branchId: { in: ctx.branchIds } } },
          },
        },
      ],
    };
  }

  return { actorId: ctx.userId };
}
