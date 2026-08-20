import { NextResponse } from "next/server";
import { fetchRatesFromGhs } from "@/lib/fx";

export async function GET() {
  const { rates, source } = await fetchRatesFromGhs();
  return NextResponse.json({ rates, source, base: "GHS" });
}
