import type { Prisma } from "@prisma/client";
import type { AdminContext } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { staffRoleNeedsCountry } from "@/lib/rbac";

export async function checkoutAbandonmentWhere(
  ctx: AdminContext
): Promise<Prisma.CheckoutAbandonmentWhereInput> {
  const base: Prisma.CheckoutAbandonmentWhereInput = { status: "ACTIVE" };

  if (ctx.isGlobal || ctx.isSuperAdmin) return base;

  if (staffRoleNeedsCountry(ctx.staffRole) && ctx.staffCountry) {
    return { ...base, shippingCountry: ctx.staffCountry };
  }

  if (ctx.branchIds.length) {
    const branches = await prisma.branch.findMany({
      where: { id: { in: ctx.branchIds } },
      select: { country: true },
    });
    const countries = [...new Set(branches.map((b) => b.country.toUpperCase()))];
    if (countries.length) {
      return { ...base, shippingCountry: { in: countries } };
    }
  }

  return { ...base, id: "__none__" };
}
