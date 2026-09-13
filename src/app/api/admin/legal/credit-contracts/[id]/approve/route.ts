import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { approveCreditContract } from "@/lib/credit-agreement";
import { writeAuditLog } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await requireAdminApi("legal.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orderId = params.id;
  const result = await approveCreditContract(ctx, orderId);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  await writeAuditLog({
    actorId: ctx.userId,
    action: "legal.credit_contract.approve",
    entityType: "Order",
    entityId: orderId,
    summary: "Credit purchase agreement approved for print",
    req,
  });

  return NextResponse.json({ ok: true });
}
