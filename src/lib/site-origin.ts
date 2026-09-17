/** Allowed site origins for checkout redirects and admin CSRF checks. */
export function allowedSiteOrigins(): string[] {
  const raw = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.CHECKOUT_ALLOWED_ORIGINS,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);

  return [...new Set(raw)];
}

export function originFromRequest(req: Request): string | null {
  const origin = req.headers.get("origin")?.trim().replace(/\/$/, "");
  if (origin && /^https?:\/\/[^\s/]+/i.test(origin)) return origin;

  const referer = req.headers.get("referer")?.trim();
  if (referer) {
    try {
      const url = new URL(referer);
      return `${url.protocol}//${url.host}`.replace(/\/$/, "");
    } catch {
      /* ignore malformed referer */
    }
  }

  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host");
  if (!host) return null;

  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`.replace(/\/$/, "");
}

export function isAllowedSiteOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const allowed = allowedSiteOrigins();
  if (allowed.some((entry) => entry === origin)) return true;

  // Dev convenience when env URLs are unset.
  if (process.env.NODE_ENV !== "production") {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  }
  return false;
}
