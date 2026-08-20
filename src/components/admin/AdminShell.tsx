"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminNotificationListener } from "@/components/admin/AdminNotificationListener";

const NAV = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/fragrances", label: "Fragrances" },
  { href: "/admin/orders", label: "Orders" },
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

  return (
    <div className="min-h-screen bg-wf-light">
      <AdminNotificationListener />
      <header className="bg-wf-black text-white">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14 gap-4">
          <Link href="/admin" className="font-playfair text-lg tracking-wider shrink-0">
            COSY AURA Admin
          </Link>
          <nav className="hidden lg:flex items-center gap-4 text-sm flex-1 justify-center flex-wrap">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "hover:text-gold transition-colors",
                    active && "text-gold"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-4 text-sm shrink-0">
            <Link
              href="/admin/notifications"
              className="relative hover:text-gold transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-gold text-white text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <Link href="/" className="hover:text-gold transition-colors hidden sm:inline">
              View Site
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
              className="hover:text-gold transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="lg:hidden border-t border-white/10 px-4 py-2 flex gap-3 overflow-x-auto text-xs">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap hover:text-gold"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-8">{children}</div>
    </div>
  );
}
