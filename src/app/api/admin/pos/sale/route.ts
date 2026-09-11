import { NextResponse } from "next/server";
import type { PosPaymentMethod } from "@prisma/client";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { normalizePosDiscount, type PosDiscountInput } from "@/lib/pos-discount";
import { createPosSale, type PosCartLine } from "@/lib/pos";
import { isBottleSize } from "@/lib/bottle-sizes";

const PAYMENT_METHODS: PosPaymentMethod[] = ["CASH", "MOMO", "CARD", "OTHER"];

export async function POST(req: Request) {
  try {
  const { ctx, error } = await requireAdminApi("pos.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const branchId = String(body.branchId || "");
  const paymentMethod = String(body.paymentMethod || "").toUpperCase() as PosPaymentMethod;

  if (!branchId) {
    return NextResponse.json({ error: "branchId is required" }, { status: 400 });
  }
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items: PosCartLine[] = [];
  for (const row of rawItems) {
    const bottleSize = Number(row.bottleSize);
    const quantity = Math.floor(Number(row.quantity) || 0);
    const unitPriceGhs = Number(row.unitPriceGhs);
    if (!row.fragranceId || !isBottleSize(bottleSize) || quantity <= 0) continue;
    if (!Number.isFinite(unitPriceGhs) || unitPriceGhs <= 0) continue;
    items.push({
      fragranceId: String(row.fragranceId),
      bottleSize,
      quantity,
      unitPriceGhs,
    });
  }

  let discount: PosDiscountInput | null = null;
  if (body.discount && typeof body.discount === "object") {
    const type = String(body.discount.type || "").toUpperCase();
    const value = Number(body.discount.value);
    if (type === "PERCENT" || type === "FIXED") {
      discount = normalizePosDiscount({ type, value });
    }
  }

  const result = await createPosSale(ctx, {
    branchId,
    items,
    paymentMethod,
    customerName: body.customerName,
    customerPhone: body.customerPhone,
    customerEmail: body.customerEmail,
    notes: body.notes,
    amountTendered: body.amountTendered,
    paymentReference: body.paymentReference,
    discount,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  await writeAuditLog({
    actorId: ctx.userId,
    action: "pos.sale",
    entityType: "Order",
    entityId: result.orderId,
    summary: `POS sale ${result.receiptNumber} · ${result.total} GHS`,
    req,
    metadata: {
      branchId,
      paymentMethod,
      receiptNumber: result.receiptNumber,
      total: result.total,
      itemCount: items.length,
      discount,
    },
  });

  return NextResponse.json({
    orderId: result.orderId,
    receiptNumber: result.receiptNumber,
    total: result.total,
    receiptUrl: `/admin/pos/receipt/${result.orderId}`,
  });
  } catch (err) {
    console.error("[pos/sale]", err);
    const message =
      err instanceof Error && err.message.includes("Unknown argument")
        ? "Server needs a refresh — restart the dev server and try again."
        : "Sale failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
