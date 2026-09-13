import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { buildYearEndPackCsv, buildYearEndPackPdf } from "@/lib/accounting-report-pack";

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("accounting.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") || new Date().getFullYear());
  const format = (searchParams.get("format") || "pdf").toLowerCase();

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  try {
    if (format === "csv") {
      const csv = await buildYearEndPackCsv(year);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="cosy-aura-year-end-${year}.csv"`,
        },
      });
    }

    const bytes = await buildYearEndPackPdf(year);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cosy-aura-year-end-${year}.pdf"`,
      },
    });
  } catch (e) {
    console.error("[accounting/reports/pack]", year, format, e);
    const message = e instanceof Error ? e.message : "Failed to build year-end pack";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
