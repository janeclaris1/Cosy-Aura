import { NextResponse } from "next/server";
import { buildGoogleShoppingCsv } from "@/lib/google-shopping-feed";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const required = process.env.GOOGLE_SHOPPING_FEED_TOKEN?.trim();
  if (!required) return process.env.NODE_ENV !== "production";

  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  return token === required;
}

/** Google Merchant Center scheduled product feed (CSV). */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const fragrances = await prisma.fragrance.findMany({
      include: {
        brand: true,
        images: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: [{ brand: { name: "asc" } }, { model: "asc" }, { bottleSize: "asc" }],
    });

    const currency = process.env.GOOGLE_SHOPPING_CURRENCY?.trim() || "GHS";
    const csv = buildGoogleShoppingCsv(fragrances, currency);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'inline; filename="cosyaura-google-shopping.csv"',
        "Cache-Control": "public, max-age=900",
      },
    });
  } catch (error) {
    console.error("[google-shopping feed]", error);
    return NextResponse.json({ error: "Could not build shopping feed" }, { status: 500 });
  }
}
