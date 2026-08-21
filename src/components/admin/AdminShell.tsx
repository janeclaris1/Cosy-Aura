"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Bell, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminNotificationListener } from "@/components/admin/AdminNotificationListener";
import { AdminBranchSwitcher } from "@/components/admin/AdminBranchSwitcher";

const NAV = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/fragrances", label: "Fragrances" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/branches", label: "Branches" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/transfers", label: "Transfers" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/activity", label: "Activity" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/shipping", label: "Shipping" },
  { href: "/admin/pricing", label: "Settings" },
  { href: "/admin/brands", label: "Brands" },
  { href: "/admin/posts", label: "Journal" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/subscribers", label: "Subscribers" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/notifications", label: "Alerts" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/notifications");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setUnread(data.unread || 0);
      } catch {
        /* ignore */
      }
    }
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pathname]);

  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-white/10 text-[#FFD200] font-medium"
                : "text-white/85 hover:bg-white/5 hover:text-white"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarFooter = (
    <div className="border-t border-white/10 p-3 space-y-3 shrink-0">
      <AdminBranchSwitcher />
      <div className="flex items-center gap-3 px-1">
        <Link
          href="/admin/notifications"
          className="relative inline-flex items-center justify-center text-white/85 hover:text-[#FFD200] transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#FFD200] text-[#03045e] text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
        <Link
          href="/"
          className="text-sm text-white/85 hover:text-[#FFD200] transition-colors"
        >
          View Site
        </Link>
      </div>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/admin/login" })}
        className="w-full text-left rounded-md px-3 py-2 text-sm text-white/85 hover:bg-white/5 hover:text-[#FFD200] transition-colors"
      >
        Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-wf-light lg:flex">
      <AdminNotificationListener />

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen bg-[#03045e] text-white">
        <div className="px-4 py-5 border-b border-white/10 shrink-0">
          <Link href="/admin" className="font-playfair text-lg tracking-wider">
            COSY AURA Admin
          </Link>
        </div>
        {nav}
        {sidebarFooter}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-[#03045e] text-white">
        <div className="flex items-center justify-between gap-3 px-4 h-14">
          <Link href="/admin" className="font-playfair text-base tracking-wider">
            COSY AURA Admin
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/notifications"
              className="relative hover:text-[#FFD200]"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#FFD200] text-[#03045e] text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex items-center justify-center min-h-10 min-w-10"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex flex-col w-[min(100%,18rem)] h-full bg-[#03045e] text-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <Link href="/admin" className="font-playfair text-lg tracking-wider">
                COSY AURA Admin
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center min-h-10 min-w-10"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {nav}
            {sidebarFooter}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto px-4 py-8">{children}</div>
      </div>
    </div>
  );
}
