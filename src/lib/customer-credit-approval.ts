import { prisma } from "@/lib/prisma";
import type { AdminContext } from "@/lib/admin";

export async function setCustomerCreditApproval(
  ctx: AdminContext,
  customerUserId: string,
  approved: boolean
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const customer = await prisma.user.findUnique({
    where: { id: customerUserId },
    select: { id: true, role: true },
  });

  if (!customer || customer.role !== "USER") {
    return { ok: false, reason: "Customer not found" };
  }

  await prisma.user.update({
    where: { id: customerUserId },
    data: approved
      ? {
          creditApproved: true,
          creditApprovedAt: new Date(),
          creditApprovedByUserId: ctx.userId,
        }
      : {
          creditApproved: false,
          creditApprovedAt: null,
          creditApprovedByUserId: null,
        },
  });

  return { ok: true };
}
