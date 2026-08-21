import { NextResponse } from "next/server";
import { getSizeStockForFragrance } from "@/lib/size-stock-server";

/** Public size stock for a fragrance in the shopper's country. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fragranceId = String(searchParams.get("fragranceId") || "").trim();
  const country = String(searchParams.get("country") || "")
    .trim()
    .toUpperCase();
  if (!fragranceId) {
    return NextResponse.json({ error: "fragranceId required" }, { status: 400 });
  }
  const quantities = await getSizeStockForFragrance(fragranceId, country || null);
  return NextResponse.json({
    fragranceId,
    country: country || null,
    quantities,
  });
}
