import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { voidPosSale } from "@/lib/pos";

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("pos.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const orderId = String(body.orderId || "").trim();
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const result = await voidPosSale(ctx, orderId);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  await writeAuditLog({
    actorId: ctx.userId,
    action: "pos.void",
    entityType: "Order",
    entityId: orderId,
    summary: `Voided POS sale ${orderId.slice(0, 8).toUpperCase()}`,
    req,
  });

  return NextResponse.json({ ok: true });
}
