import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { isMaintenanceBypassPath } from "@/lib/maintenance-paths";

const adminApiHits = new Map<string, number[]>();

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

  // Basic rate limit on admin API mutations (per IP, edge memory)
  if (
    pathname.startsWith("/api/admin") &&
    !["GET", "HEAD", "OPTIONS"].includes(req.method)
  ) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "local";
    const key = `mw:${ip}`;
    const now = Date.now();
    const windowMs = 60_000;
    const maxHits = 90;
    const recent = (adminApiHits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= maxHits) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }
    recent.push(now);
    adminApiHits.set(key, recent);
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
