import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { setCustomerCreditApproval } from "@/lib/customer-credit-approval";
import { writeAuditLog } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await requireAdminApi("customers.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const approved = Boolean(body.approved);

  let result: Awaited<ReturnType<typeof setCustomerCreditApproval>>;
  try {
    result = await setCustomerCreditApproval(ctx, params.id, approved);
  } catch (err) {
    console.error("[customers/credit]", err);
    const staleClient =
      err instanceof Error && err.message.includes("Unknown argument");
    return NextResponse.json(
      {
        error: staleClient
          ? "Server needs a refresh — run npx prisma generate and restart the dev server."
          : "Could not update credit approval",
      },
      { status: 500 }
    );
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  await writeAuditLog({
    actorId: ctx.userId,
    action: approved ? "customer.credit.approve" : "customer.credit.revoke",
    entityType: "User",
    entityId: params.id,
    summary: approved ? "Customer approved for in-store credit" : "Customer credit approval revoked",
    req,
  });

  return NextResponse.json({ ok: true, approved });
}
