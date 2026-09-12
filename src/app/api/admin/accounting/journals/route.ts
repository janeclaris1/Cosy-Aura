import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { GH_ACCOUNTING_COUNTRY } from "@/lib/accounting-gh-coa";
import { defaultMonthKey } from "@/lib/hr-scope";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("accounting.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || defaultMonthKey();
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));

  const journals = await prisma.journalEntry.findMany({
    where: {
      country: GH_ACCOUNTING_COUNTRY,
      status: "POSTED",
      entryDate: { gte: start, lte: end },
    },
    orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      createdBy: { select: { name: true, email: true } },
      branch: { select: { name: true } },
      lines: {
        include: {
          account: { select: { code: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({ journals, month, country: GH_ACCOUNTING_COUNTRY });
}
