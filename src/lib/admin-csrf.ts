import { isAllowedSiteOrigin, originFromRequest } from "@/lib/site-origin";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Block cross-site admin mutations when Origin/Referer is not on the allowlist. */
export function isAdminMutationCsrfBlocked(req: Request): boolean {
  if (!MUTATION_METHODS.has(req.method.toUpperCase())) return false;
  const origin = originFromRequest(req);
  return !isAllowedSiteOrigin(origin);
}
