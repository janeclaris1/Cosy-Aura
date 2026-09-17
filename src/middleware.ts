import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { isAdminMutationCsrfBlocked } from "@/lib/admin-csrf";
import { isMaintenanceBypassPath } from "@/lib/maintenance-paths";
import { clientIp, isRateLimited } from "@/lib/rate-limit";

function isMaintenanceEnvForced() {
  const value = process.env.MAINTENANCE_MODE?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js";

  if (isPublicAsset) {
    return NextResponse.next();
  }

  // Probe + health must never enter redirect logic.
  if (
    pathname === "/api/store/maintenance" ||
    pathname.startsWith("/api/health")
  ) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  /**
   * Only env can force maintenance in middleware.
   * DB-backed admin toggle is enforced in root layout (fresh Prisma read).
   * Do NOT self-fetch /api/store/maintenance here — on Hostinger that often
   * fails and used to bounce /maintenance ↔ / forever.
   */
  if (isMaintenanceEnvForced() && !isMaintenanceBypassPath(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/maintenance";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Admin route protection (except login + set-password)
  const isAdminArea =
    pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminPublic =
    pathname === "/admin/login" || pathname === "/admin/set-password";

  if (isAdminArea && !isAdminPublic) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  // CSRF + rate limit admin API mutations (Upstash when configured, else edge memory)
  if (
    pathname.startsWith("/api/admin") &&
    !["GET", "HEAD", "OPTIONS"].includes(req.method)
  ) {
    if (isAdminMutationCsrfBlocked(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limited = await isRateLimited(`admin-mw:${clientIp(req)}`, 90, 60_000);
    if (limited) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
