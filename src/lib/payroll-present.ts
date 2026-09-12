import type { PayRun, PayRunLine, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PayRunLineWithRelations = PayRunLine & {
  staff?: Pick<User, "id" | "name" | "email" | "image"> | null;
  branches?: string[];
};

type PayRunWithLines = PayRun & {
  lines: PayRunLine[];
  branch?: { id: string; name: string; country?: string } | null;
};

export async function enrichPayRunLines<T extends PayRunWithLines>(
  payRun: T
): Promise<
  T & {
    lines: PayRunLineWithRelations[];
  }
> {
  const userIds = [...new Set(payRun.lines.map((l) => l.userId))];
  if (!userIds.length) {
    return { ...payRun, lines: payRun.lines.map((line) => ({ ...line, staff: null, branches: [] })) };
  }

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      staffAssignments: {
        select: {
          branch: { select: { name: true, country: true } },
        },
      },
    },
  });

  const userMap = new Map(
    users.map((u) => [
      u.id,
      {
        staff: {
          id: u.id,
          name: u.name,
          email: u.email,
          image: u.image,
        },
        branches: u.staffAssignments
          .filter((a) => !payRun.country || a.branch.country === payRun.country)
          .map((a) => a.branch.name),
      },
    ])
  );

  return {
    ...payRun,
    lines: payRun.lines.map((line) => {
      const info = userMap.get(line.userId);
      return {
        ...line,
        staff: info?.staff || null,
        branches: info?.branches || [],
      };
    }),
  };
}
