import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { enrichPayRunLines } from "@/lib/payroll-present";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireAdminApi("payroll.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const payRun = await prisma.payRun.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, name: true, country: true } },
      createdBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
      lines: {
        orderBy: { grossPay: "desc" },
      },
    },
  });

  if (!payRun) {
    return NextResponse.json({ error: "Pay run not found" }, { status: 404 });
  }

  return NextResponse.json({
    payRun: await enrichPayRunLines(payRun),
  });
}
