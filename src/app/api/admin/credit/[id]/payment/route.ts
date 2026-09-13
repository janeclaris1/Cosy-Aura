import { NextResponse } from "next/server";
import type { PosPaymentMethod } from "@prisma/client";
import { requireAdminApi } from "@/lib/admin";
import { recordCreditBalancePayment } from "@/lib/credit-agreement";
import { writeAuditLog } from "@/lib/audit";

const METHODS: PosPaymentMethod[] = ["CASH", "MOMO", "CARD", "OTHER"];

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await requireAdminApi("accounting.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const paymentMethod = String(body.paymentMethod || "").toUpperCase() as PosPaymentMethod;
  if (!METHODS.includes(paymentMethod)) {
    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
  }

  const result = await recordCreditBalancePayment(ctx, params.id, {
    amountGhs: Number(body.amountGhs),
    paymentMethod,
    paymentReference: body.paymentReference,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  await writeAuditLog({
    actorId: ctx.userId,
    action: "credit.payment",
    entityType: "CreditAgreement",
    entityId: params.id,
    summary: `Credit balance payment · GHS ${body.amountGhs}`,
    req,
  });

  return NextResponse.json({ ok: true });
}
