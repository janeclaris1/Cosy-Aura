"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { ExternalLink, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_GROUPS } from "@/lib/admin-nav";
import { AdminNotificationListener } from "@/components/admin/AdminNotificationListener";
import { AdminBranchSwitcher } from "@/components/admin/AdminBranchSwitcher";
import { StaffAvatar } from "@/components/admin/StaffAvatar";

type AdminProfileSummary = {
  name: string | null;
  email: string;
  image: string | null;
};

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [profile, setProfile] = useState<AdminProfileSummary | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    async function loadNotifications() {
      try {
        const res = await fetch("/api/admin/notifications");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setUnread(data.unread || 0);
      } catch {
        /* ignore */
      }
    }
    loadNotifications();
    const id = setInterval(loadNotifications, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    async function loadOrderCount() {
      try {
        const res = await fetch("/api/admin/orders/count", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data.total === "number") {
          setOrderCount(data.total);
        }
      } catch {
        /* ignore */
      }
    }
    loadOrderCount();
    const id = setInterval(loadOrderCount, 30000);
    const onOrdersChanged = () => {
      void loadOrderCount();
    };
    window.addEventListener("admin:orders-changed", onOrdersChanged);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("admin:orders-changed", onOrdersChanged);
    };
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        const res = await fetch("/api/admin/profile", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.profile) {
          setProfile({
            name: data.profile.name,
            email: data.profile.email,
            image: data.profile.image,
          });
        }
      } catch {
        /* ignore */
      }
    }
    loadProfile();
    const onProfileChanged = () => {
      void loadProfile();
    };
    window.addEventListener("admin:profile-changed", onProfileChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("admin:profile-changed", onProfileChanged);
    };
  }, [pathname]);

  const navPillBorder =
    "rounded-2xl bg-white border border-[#03045e]/15";

  const navLinkClass = (active: boolean) =>
    cn(
      "group flex items-center gap-3 px-3.5 py-2.5 text-[13px] text-[#03045e] transition-all duration-200",
      navPillBorder,
      active
        ? "font-semibold border-[#03045e]/35"
        : "font-medium hover:border-[#03045e]/25"
    );

  const navIconClass = () =>
    cn("w-[18px] h-[18px] shrink-0 text-[#03045e]");

  const navContent = (
    <nav className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.label} className="mb-1">
          <p className="px-3.5 pt-4 pb-2 font-playfair text-[11px] uppercase tracking-[0.14em] text-white/45">
            {group.label}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              const Icon = item.icon;
              const showAlertBadge = item.badge === "alerts" && unread > 0;
              const showOrderBadge =
                item.badge === "orders" && orderCount !== null && orderCount > 0;
              const orderBadgeLabel =
                orderCount !== null && orderCount > 9999
                  ? "9999+"
                  : orderCount !== null && orderCount > 999
                    ? `${Math.floor(orderCount / 1000)}k+`
                    : String(orderCount ?? "");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={navLinkClass(active)}
                  >
                    <Icon className={navIconClass()} strokeWidth={1.75} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {showAlertBadge && (
                      <span className="text-[10px] font-semibold tabular-nums min-w-[1.25rem] h-[1.25rem] px-1 rounded-full flex items-center justify-center bg-[#03045e] text-white">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                    {showOrderBadge && (
                      <span className="text-[10px] font-semibold tabular-nums min-w-[1.25rem] h-[1.25rem] px-1.5 rounded-full flex items-center justify-center bg-[#03045e] text-white">
                        {orderBadgeLabel}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const sidebarHeader = (
    <div className="shrink-0 border-b border-white/[0.08] px-4 py-4">
      <div className="flex flex-col items-center gap-2 text-center">
        {profile ? (
          <Link
            href="/admin/profile"
            aria-label="My profile"
            className={cn(
              "shrink-0 transition-opacity hover:opacity-90",
              isActive(pathname, "/admin/profile") && "opacity-100"
            )}
          >
            <StaffAvatar
              name={profile.name}
              email={profile.email}
              image={profile.image}
              size="lg"
              className="ring-2 ring-white/25"
            />
          </Link>
        ) : null}
        <Link
          href="/admin"
          className="font-playfair text-lg text-white leading-none hover:text-white/90 transition-colors"
        >
          Admin
        </Link>
      </div>
    </div>
  );

  const sidebarFooter = (
    <div className="border-t border-white/[0.08] p-3 space-y-2 shrink-0">
      <AdminBranchSwitcher />
      <div className="flex items-center gap-1.5 px-0.5">
        <Link
          href="/"
          className={cn(
            "flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-[#03045e] hover:border-[#03045e]/25 transition-colors",
            navPillBorder
          )}
        >
          <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
          View site
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className={cn(
            "flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-[#03045e] hover:border-[#03045e]/25 transition-colors",
            navPillBorder
          )}
        >
          <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="admin-app min-h-screen bg-[#f7f6f3] lg:flex">
      <AdminNotificationListener />

      {/* Desktop sidebar */}
      <aside className="admin-shell-chrome hidden lg:flex lg:flex-col lg:w-[15.5rem] lg:shrink-0 lg:sticky lg:top-0 lg:h-screen bg-[#03045e] text-white border-r border-[#020338] print:hidden">
        {sidebarHeader}
        {navContent}
        {sidebarFooter}
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
      {/* Mobile top bar */}
      <div className="admin-shell-chrome lg:hidden sticky top-0 z-40 bg-[#03045e] text-white border-b border-white/[0.08] print:hidden shrink-0">
        <div className="flex items-center justify-between gap-3 px-4 h-14">
          <Link href="/admin" className="font-playfair text-base text-white">
            Admin
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center min-h-10 min-w-10 rounded-lg hover:bg-white/[0.07]"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            className="absolute inset-0 bg-[#03045e]/60 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex flex-col w-[min(100%,17.5rem)] h-full bg-[#03045e] text-white shadow-2xl">
            <div className="shrink-0 border-b border-white/[0.08] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col items-center gap-2 min-w-0">
                  {profile ? (
                    <Link href="/admin/profile" aria-label="My profile" className="shrink-0">
                      <StaffAvatar
                        name={profile.name}
                        email={profile.email}
                        image={profile.image}
                        size="md"
                        className="ring-2 ring-white/25"
                      />
                    </Link>
                  ) : null}
                  <Link
                    href="/admin"
                    className="font-playfair text-lg text-white leading-none"
                  >
                    Admin
                  </Link>
                </div>
                <div className="flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center min-h-10 min-w-10 rounded-lg hover:bg-white/[0.07]"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            </div>
            {navContent}
            {sidebarFooter}
          </aside>
        </div>
      )}

        <div className="admin-print-area flow-root flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pb-8 pt-6 max-lg:pt-8 lg:py-10 print:p-0 print:max-w-none">
          {children}
        </div>
      </div>
    </div>
  );
}
