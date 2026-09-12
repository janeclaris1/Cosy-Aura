import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import {
  profitAndLossForMonth,
  trialBalanceForMonth,
} from "@/lib/accounting-reports";
import { GH_ACCOUNTING_COUNTRY } from "@/lib/accounting-gh-coa";
import { defaultMonthKey } from "@/lib/hr-scope";

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("accounting.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || defaultMonthKey();
  const report = searchParams.get("report") || "pl";

  if (report === "trial") {
    const trial = await trialBalanceForMonth(month, GH_ACCOUNTING_COUNTRY);
    return NextResponse.json({ report: "trial", month, country: GH_ACCOUNTING_COUNTRY, ...trial });
  }

  const pl = await profitAndLossForMonth(month, GH_ACCOUNTING_COUNTRY);
  return NextResponse.json({ report: "pl", month, country: GH_ACCOUNTING_COUNTRY, ...pl });
}
