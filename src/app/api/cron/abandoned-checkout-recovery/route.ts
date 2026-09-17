import { NextResponse } from "next/server";
import {
  isCronAuthorized,
  processAutomaticCheckoutRecoveryEmails,
} from "@/lib/checkout-abandonment-recovery";

export const dynamic = "force-dynamic";

/** Call hourly via Hostinger cron or similar: Authorization: Bearer $CRON_SECRET */
export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processAutomaticCheckoutRecoveryEmails();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/abandoned-checkout-recovery]", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
