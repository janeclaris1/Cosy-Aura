import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { backfillAllFragranceBarcodes } from "@/lib/barcodes";

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("catalog.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await backfillAllFragranceBarcodes();

  await writeAuditLog({
    actorId: ctx.userId,
    action: "catalog.barcodes.backfill",
    entityType: "Fragrance",
    summary: `Generated ${result.created} missing barcode(s) across ${result.fragrances} fragrances`,
    req,
    metadata: result,
  });

  return NextResponse.json({ ok: true, ...result });
}
