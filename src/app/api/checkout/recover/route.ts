import { NextResponse } from "next/server";
import { loadRecoveredCheckoutCart } from "@/lib/checkout-abandonment-recovery";
import { checkPublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";

export async function GET(req: Request) {
  if (await checkPublicRateLimit(req, "checkout-recover", 30)) {
    return rateLimitResponse();
  }

  const token = new URL(req.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const result = await loadRecoveredCheckoutCart(token);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 404 });
  }

  return NextResponse.json({
    email: result.email,
    subtotalGhs: result.subtotalGhs,
    items: result.items,
  });
}
