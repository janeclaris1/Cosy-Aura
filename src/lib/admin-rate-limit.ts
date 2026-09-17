/**
 * Admin API rate limiting — delegates to shared store (memory or Upstash Redis).
 */

import {
  clientIp,
  isRateLimited,
  isRateLimitedSync,
  isRequestRateLimited,
} from "@/lib/rate-limit";

export { clientIp, isRequestRateLimited };

const WINDOW_MS = 60 * 1000;
const MAX_HITS = 60;

/** @deprecated Prefer isRequestRateLimited (async) for Redis-backed limits. */
export function isAdminRateLimited(
  req: Request,
  key = "admin",
  maxHits = MAX_HITS,
  windowMs = WINDOW_MS
): boolean {
  const ip = clientIp(req);
  return isRateLimitedSync(`${key}:${ip}`, maxHits, windowMs);
}

export async function isAdminRateLimitedAsync(
  req: Request,
  key = "admin",
  maxHits = MAX_HITS,
  windowMs = WINDOW_MS
): Promise<boolean> {
  return isRequestRateLimited(req, key, maxHits, windowMs);
}

export async function isPublicRateLimitedAsync(
  req: Request,
  key: string,
  maxHits = 30,
  windowMs = WINDOW_MS
): Promise<boolean> {
  return isRequestRateLimited(req, `public:${key}`, maxHits, windowMs);
}

export { isRateLimited };
