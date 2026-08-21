/**
 * Simple in-memory rate limiter for admin APIs (per IP + route key).
 * Suitable for single-instance / low-traffic; use Redis in multi-instance prod if needed.
 */

const WINDOW_MS = 60 * 1000;
const MAX_HITS = 60; // 60 req/min per IP for admin APIs
const hits = new Map<string, number[]>();

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

export function isAdminRateLimited(
  req: Request,
  key = "admin",
  maxHits = MAX_HITS,
  windowMs = WINDOW_MS
): boolean {
  const ip = clientIp(req);
  const bucket = `${key}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(bucket) || []).filter((t) => now - t < windowMs);
  if (recent.length >= maxHits) {
    hits.set(bucket, recent);
    return true;
  }
  recent.push(now);
  hits.set(bucket, recent);
  return false;
}
