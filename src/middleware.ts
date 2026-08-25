import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const adminApiHits = new Map<string, number[]>();

let maintenanceCache: { at: number; enabled: boolean } | null = null;
const MAINTENANCE_CACHE_MS = 8_000;

function isMaintenanceEnvForced() {
  const value = process.env.MAINTENANCE_MODE?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

async function isMaintenanceEnabled(req: NextRequest): Promise<boolean> {
  if (isMaintenanceEnvForced()) return true;

  if (
    maintenanceCache &&
    Date.now() - maintenanceCache.at < MAINTENANCE_CACHE_MS
  ) {
    return maintenanceCache.enabled;
  }

  try {
    const probe = new URL("/api/store/maintenance", req.nextUrl.origin);
    const res = await fetch(probe, {
      cache: "no-store",
      headers: { "x-maintenance-probe": "1" },
    });
    if (!res.ok) {
      maintenanceCache = { at: Date.now(), enabled: false };
      return false;
    }
    const data = (await res.json()) as { enabled?: boolean };
    const enabled = Boolean(data.enabled);
    maintenanceCache = { at: Date.now(), enabled };
    return enabled;
  } catch {
    return maintenanceCache?.enabled ?? false;
  }
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

  // Always allow the maintenance probe so middleware can read StoreConfig.
  if (pathname === "/api/store/maintenance") {
    return NextResponse.next();
  }

  const maintenanceOn = await isMaintenanceEnabled(req);

  // When maintenance is off, don't leave visitors stuck on /maintenance
  if (!maintenanceOn && pathname.startsWith("/maintenance")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Maintenance mode: redirect storefront to /maintenance
  // Keep admin + auth APIs available so you can still manage the site.
  if (maintenanceOn) {
    const allowedDuringMaintenance =
      pathname.startsWith("/maintenance") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/api/admin") ||
      pathname.startsWith("/api/auth") ||
      pathname.startsWith("/api/health");

    if (!allowedDuringMaintenance) {
      const url = req.nextUrl.clone();
      url.pathname = "/maintenance";
      url.search = "";
      return NextResponse.redirect(url);
    }
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

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
