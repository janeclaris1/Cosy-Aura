import { prisma } from "@/lib/prisma";

export function accountOrdersWhere(userId: string, email: string) {
  return {
    OR: [{ userId }, { email }],
    status: { not: "PENDING" as const },
  };
}

const orderInclude = {
  items: {
    include: {
      fragrance: { include: { brand: true } },
    },
  },
} as const;

export async function countAccountOrders(userId: string, email: string) {
  return prisma.order.count({
    where: accountOrdersWhere(userId, email),
  });
}

export async function fetchAccountOrders(
  userId: string,
  email: string,
  options?: { take?: number }
) {
  return prisma.order.findMany({
    where: accountOrdersWhere(userId, email),
    include: orderInclude,
    orderBy: { createdAt: "desc" },
    ...(options?.take ? { take: options.take } : {}),
  });
}
