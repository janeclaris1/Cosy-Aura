import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { buildOrderReceiptPdf } from "@/lib/order-receipt-pdf";
import {
  receiptFilename,
  toReceiptOrder,
  verifyReceiptToken,
} from "@/lib/order-receipt";

export async function GET(
  req: Request,
  { params }: { params: { orderId: string } }
) {
  const orderId = params.orderId;
  const token = new URL(req.url).searchParams.get("t");
  const tokenOk = verifyReceiptToken(orderId, token);

  if (!tokenOk) {
    const { error } = await requireAdminApi();
    if (error) return error;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { fragrance: { include: { brand: true } } } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  try {
    const pdf = await buildOrderReceiptPdf(toReceiptOrder(order));
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${receiptFilename(order.id)}"`,
        "Cache-Control": "private, max-age=120",
      },
    });
  } catch (error) {
    console.error("[receipt] pdf failed:", error);
    return NextResponse.json({ error: "Could not build receipt" }, { status: 500 });
  }
}
