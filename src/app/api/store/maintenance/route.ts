import { NextResponse } from "next/server";
import { getMaintenanceStatus } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

/** Public probe for middleware / uptime — no secrets. */
export async function GET() {
  const status = await getMaintenanceStatus();
  return NextResponse.json(status, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
