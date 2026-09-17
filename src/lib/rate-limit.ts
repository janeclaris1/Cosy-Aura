/**
 * Fixed-window rate limiting with in-memory fallback.
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, counts are shared across instances.
 */

const memoryHits = new Map<string, number[]>();

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

function memoryRateLimited(
  bucketKey: string,
  maxHits: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const recent = (memoryHits.get(bucketKey) || []).filter((t) => now - t < windowMs);
  if (recent.length >= maxHits) {
    memoryHits.set(bucketKey, recent);
    return true;
  }
  recent.push(now);
  memoryHits.set(bucketKey, recent);
  return false;
}

async function upstashIncrement(
  bucketKey: string,
  windowSec: number
): Promise<number | null> {
  const base = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!base || !token) return null;

  const key = `rl:${bucketKey}`;
  const headers = { Authorization: `Bearer ${token}` };

  try {
    const incrRes = await fetch(`${base}/incr/${encodeURIComponent(key)}`, {
      method: "POST",
      headers,
    });
    if (!incrRes.ok) return null;
    const incrJson = (await incrRes.json()) as { result?: number };
    const count = incrJson.result;
    if (typeof count !== "number") return null;

    if (count === 1) {
      await fetch(`${base}/expire/${encodeURIComponent(key)}/${windowSec}`, {
        method: "POST",
        headers,
      });
    }

    return count;
  } catch {
    return null;
  }
}

/** Returns true when the request should be blocked. */
export async function isRateLimited(
  bucketKey: string,
  maxHits: number,
  windowMs = 60_000
): Promise<boolean> {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const redisCount = await upstashIncrement(bucketKey, windowSec);
  if (redisCount !== null) {
    return redisCount > maxHits;
  }
  return memoryRateLimited(bucketKey, maxHits, windowMs);
}

/** Sync in-memory check only (edge paths that cannot await Redis). */
export function isRateLimitedSync(
  bucketKey: string,
  maxHits: number,
  windowMs = 60_000
): boolean {
  return memoryRateLimited(bucketKey, maxHits, windowMs);
}

export async function isRequestRateLimited(
  req: Request,
  key: string,
  maxHits: number,
  windowMs = 60_000
): Promise<boolean> {
  return isRateLimited(`${key}:${clientIp(req)}`, maxHits, windowMs);
}
