import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { processOverdueCreditDefaults } from "@/lib/credit-agreement";
import { creditAgreementWhere } from "@/lib/credit-scope";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("accounting.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await processOverdueCreditDefaults(
    ctx.userId,
    creditAgreementWhere(ctx)
  );

  await writeAuditLog({
    actorId: ctx.userId,
    action: "credit.process_overdue",
    entityType: "CreditAgreement",
    entityId: "batch",
    summary: `Processed ${result.processed} overdue credit default(s)`,
    req,
    metadata: result,
  });

  return NextResponse.json(result);
}
