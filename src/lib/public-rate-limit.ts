import { isPublicRateLimitedAsync } from "@/lib/admin-rate-limit";
import { clientIp, isRateLimitedSync } from "@/lib/rate-limit";

/** Sync in-memory limit (legacy). Prefer checkPublicRateLimit in new code. */
export function isPublicRateLimited(
  req: Request,
  key: string,
  maxHits = 30,
  windowMs = 60_000
): boolean {
  const ip = clientIp(req);
  return isRateLimitedSync(`public:${key}:${ip}`, maxHits, windowMs);
}

export async function checkPublicRateLimit(
  req: Request,
  key: string,
  maxHits = 30,
  windowMs = 60_000
): Promise<boolean> {
  return isPublicRateLimitedAsync(req, key, maxHits, windowMs);
}

export function rateLimitResponse() {
  return Response.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429 }
  );
}

export { clientIp };
