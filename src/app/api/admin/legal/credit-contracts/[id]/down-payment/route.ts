import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { isDownPaymentMethod, recordCreditDownPayment } from "@/lib/credit-agreement";
import { writeAuditLog } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await requireAdminApi("legal.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const rawMethod = String(body.downPaymentMethod || "").toUpperCase();
  if (!isDownPaymentMethod(rawMethod)) {
    return NextResponse.json(
      { error: "Select how the down payment was collected" },
      { status: 400 }
    );
  }

  const result = await recordCreditDownPayment(ctx, params.id, {
    downPaymentMethod: rawMethod,
    downPaymentReference: body.downPaymentReference,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  await writeAuditLog({
    actorId: ctx.userId,
    action: "legal.credit_contract.down_payment",
    entityType: "Order",
    entityId: params.id,
    summary: "Credit contract signed — down payment recorded, receipt unlocked",
    req,
  });

  return NextResponse.json({ ok: true, receiptUrl: result.receiptUrl });
}
