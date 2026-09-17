import type { Prisma } from "@prisma/client";
import type { AdminContext } from "@/lib/admin";
import { orderBranchWhere } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

/** Prisma filter for credit agreements scoped to the admin's branches/country. */
export function creditAgreementWhere(
  ctx: AdminContext
): Prisma.CreditAgreementWhereInput {
  const orderScope = orderBranchWhere(ctx);
  if (!orderScope) return {};
  return { order: orderScope };
}

/** True when this admin may act on the given order id. */
export async function orderAccessibleToAdmin(
  ctx: AdminContext,
  orderId: string
): Promise<boolean> {
  const orderScope = orderBranchWhere(ctx);
  if (!orderScope) return true;
  const row = await prisma.order.findFirst({
    where: { id: orderId, ...orderScope },
    select: { id: true },
  });
  return Boolean(row);
}

/** True when this admin may act on the given credit agreement id. */
export async function creditAgreementAccessibleToAdmin(
  ctx: AdminContext,
  agreementId: string
): Promise<boolean> {
  const where = creditAgreementWhere(ctx);
  const row = await prisma.creditAgreement.findFirst({
    where: { id: agreementId, ...where },
    select: { id: true },
  });
  return Boolean(row);
}
