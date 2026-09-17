import {
  allowedSiteOrigins,
  isAllowedSiteOrigin,
  originFromRequest,
} from "@/lib/site-origin";

/** Payment callback base URL — never trust arbitrary Origin headers. */
export function checkoutBaseUrl(req: Request): string {
  const candidate = originFromRequest(req);

  if (candidate && isAllowedSiteOrigin(candidate)) {
    return candidate;
  }

  const allowed = allowedSiteOrigins();
  if (allowed.length) return allowed[0];

  return "http://localhost:3000";
}
