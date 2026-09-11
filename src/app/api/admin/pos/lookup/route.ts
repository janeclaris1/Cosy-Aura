import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { lookupBarcodeForBranch, normalizeBarcode } from "@/lib/pos";

export async function GET(req: Request) {
  const { error } = await requireAdminApi("pos.read", { req });
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const barcode = normalizeBarcode(searchParams.get("barcode") || "");
  const branchId = searchParams.get("branchId") || "";

  if (!barcode || !branchId) {
    return NextResponse.json(
      { error: "barcode and branchId are required" },
      { status: 400 }
    );
  }

  const result = await lookupBarcodeForBranch(barcode, branchId);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 404 });
  }

  return NextResponse.json(result.product);
}
