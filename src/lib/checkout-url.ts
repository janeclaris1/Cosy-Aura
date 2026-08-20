/** Stay on the shopper's current host (localhost / preview / prod). */
export function checkoutBaseUrl(req: Request): string {
  const origin = req.headers.get("origin");
  if (origin && /^https?:\/\/[^\s/]+/i.test(origin)) {
    return origin.replace(/\/$/, "");
  }
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host");
  if (host) {
    const proto =
      req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}
