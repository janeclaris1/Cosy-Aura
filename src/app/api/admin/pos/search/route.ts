import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { searchPosProducts } from "@/lib/pos";

export async function GET(req: Request) {
  const { error } = await requireAdminApi("pos.read", { req });
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const branchId = searchParams.get("branchId") || "";

  const results = await searchPosProducts(q, branchId);
  return NextResponse.json({ results });
}
