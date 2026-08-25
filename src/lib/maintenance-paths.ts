/** Edge-safe path helpers (no Node / Prisma imports). */

/** Paths that stay reachable while the storefront is in maintenance. */
export function isMaintenanceBypassPath(pathname: string): boolean {
  return (
    pathname.startsWith("/maintenance") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/store/maintenance")
  );
}
