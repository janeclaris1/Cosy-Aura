import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { creditBalanceRemaining } from "@/lib/credit-agreement";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("accounting.read", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const agreements = await prisma.creditAgreement.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    include: {
      order: {
        select: {
          id: true,
          receiptNumber: true,
          shippingName: true,
          shippingPhone: true,
          email: true,
          fulfillmentBranch: { select: { name: true } },
        },
      },
      user: { select: { id: true, name: true, email: true } },
      payments: { orderBy: { paidAt: "desc" }, take: 3 },
    },
    take: 100,
  });

  return NextResponse.json({
    agreements: agreements.map((a) => ({
      ...a,
      balanceRemainingGhs: creditBalanceRemaining(a),
    })),
  });
}
