"use client";

import { usePathname } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";
  const isPos =
    pathname === "/admin/pos" || pathname.startsWith("/admin/pos/receipt/");

  if (isLogin || isPos) {
    return <>{children}</>;
  }

  return <AdminShell>{children}</AdminShell>;
}
