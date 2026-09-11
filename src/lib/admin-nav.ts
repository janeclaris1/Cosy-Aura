import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BarChart3,
  Barcode,
  Bell,
  BookOpen,
  Building2,
  Fingerprint,
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
  Users,
  Warehouse,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: "alerts" | "orders";
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/profile", label: "My profile", icon: UserCircle },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/fragrances", label: "Fragrances", icon: Droplets },
      { href: "/admin/labels", label: "Barcode labels", icon: Barcode },
      { href: "/admin/brands", label: "Brands", icon: Tag },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag, badge: "orders" },
      { href: "/admin/pos", label: "Point of sale", icon: Store },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/attendance", label: "Attendance", icon: Fingerprint },
      { href: "/admin/branches", label: "Branches", icon: Building2 },
      { href: "/admin/stock", label: "Stock", icon: Warehouse },
      { href: "/admin/transfers", label: "Transfers", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/admin/reports", label: "Reports", icon: BarChart3 },
      { href: "/admin/activity", label: "Activity log", icon: ScrollText },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/staff", label: "Staff", icon: Users },
      { href: "/admin/customers", label: "Customers", icon: UserCircle },
      { href: "/admin/subscribers", label: "Subscribers", icon: Mail },
      { href: "/admin/enquiries", label: "Enquiries", icon: MessageSquare },
    ],
  },
  {
    label: "Store",
    items: [
      { href: "/admin/shipping", label: "Shipping", icon: Truck },
      { href: "/admin/pricing", label: "Settings", icon: Settings },
    ],
  },
  {
    label: "Content",
    items: [{ href: "/admin/posts", label: "Journal", icon: BookOpen }],
  },
  {
    label: "Alerts",
    items: [
      { href: "/admin/notifications", label: "Notifications", icon: Bell, badge: "alerts" },
    ],
  },
];
