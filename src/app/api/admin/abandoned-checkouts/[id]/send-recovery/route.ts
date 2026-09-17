import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { checkoutAbandonmentWhere } from "@/lib/checkout-abandonment-scope";
import { sendCheckoutAbandonmentRecoveryEmail } from "@/lib/checkout-abandonment-recovery";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await requireAdminApi("orders.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = await checkoutAbandonmentWhere(ctx);
  const row = await prisma.checkoutAbandonment.findFirst({
    where: { id: params.id, ...scope },
    select: { id: true, email: true },
  });

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await sendCheckoutAbandonmentRecoveryEmail(row.id, { force: true });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.reason || "Could not send email" },
      { status: result.skipped ? 409 : 500 }
    );
  }

  await writeAuditLog({
    actorId: ctx.userId,
    action: "checkout_abandonment.recovery_email",
    entityType: "CheckoutAbandonment",
    entityId: row.id,
    summary: `Recovery email sent to ${row.email}`,
    req,
  });

  return NextResponse.json({ ok: true });
}
