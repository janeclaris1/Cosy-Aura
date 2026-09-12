import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BarChart3,
  Barcode,
  Bell,
  BookOpen,
  Building2,
  Fingerprint,
  Briefcase,
  LayoutDashboard,
  Mail,
  MessageSquare,
  ScrollText,
  Settings,
  ShoppingBag,
  Droplets,
  Store,
  Tag,
  Truck,
  UserCircle,
  Wallet,
  Warehouse,
  Calculator,
} from "lucide-react";
import type { Permission } from "@/lib/rbac";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: "alerts" | "orders";
  /** Required permission(s). Omit = visible to all admins. */
  permission?: Permission | Permission[];
  /** When multiple permissions, "any" = one match; default "all". */
  permissionMatch?: "all" | "any";
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: LayoutDashboard,
        exact: true,
        permission: "dashboard.read",
      },
      { href: "/admin/profile", label: "My profile", icon: UserCircle },
      {
        href: "/admin/my-hr",
        label: "My HR",
        icon: Wallet,
        permission: "hr.self.read",
      },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/fragrances", label: "Fragrances", icon: Droplets, permission: "catalog.read" },
      { href: "/admin/labels", label: "Barcode labels", icon: Barcode, permission: "catalog.read" },
      { href: "/admin/brands", label: "Brands", icon: Tag, permission: "catalog.read" },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        href: "/admin/orders",
        label: "Orders",
        icon: ShoppingBag,
        badge: "orders",
        permission: "orders.read",
      },
      { href: "/admin/pos", label: "Point of sale", icon: Store, permission: "pos.read" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/attendance", label: "Attendance", icon: Fingerprint, permission: "attendance.read" },
      { href: "/admin/branches", label: "Branches", icon: Building2, permission: "branches.read" },
      { href: "/admin/stock", label: "Stock", icon: Warehouse, permission: "stock.read" },
      { href: "/admin/transfers", label: "Transfers", icon: ArrowLeftRight, permission: "stock.read" },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/admin/reports", label: "Reports", icon: BarChart3, permission: "reports.read" },
      {
        href: "/admin/accounting",
        label: "Accounting",
        icon: Calculator,
        permission: "accounting.read",
      },
      { href: "/admin/activity", label: "Activity log", icon: ScrollText, permission: "audit.read" },
    ],
  },
  {
    label: "People",
    items: [
      {
        href: "/admin/hr",
        label: "HR & payroll",
        icon: Briefcase,
        permission: ["staff.read", "hr.read", "payroll.read"],
        permissionMatch: "any",
      },
      { href: "/admin/customers", label: "Customers", icon: UserCircle, permission: "customers.read" },
      { href: "/admin/subscribers", label: "Subscribers", icon: Mail, permission: "customers.read" },
      { href: "/admin/enquiries", label: "Enquiries", icon: MessageSquare, permission: "enquiries.read" },
    ],
  },
  {
    label: "Store",
    items: [
      { href: "/admin/shipping", label: "Shipping", icon: Truck, permission: "shipping.write" },
      { href: "/admin/pricing", label: "Settings", icon: Settings, permission: "settings.write" },
    ],
  },
  {
    label: "Content",
    items: [{ href: "/admin/posts", label: "Journal", icon: BookOpen, permission: "content.write" }],
  },
  {
    label: "Alerts",
    items: [
      {
        href: "/admin/notifications",
        label: "Notifications",
        icon: Bell,
        badge: "alerts",
        permission: "notifications.read",
      },
    ],
  },
];
