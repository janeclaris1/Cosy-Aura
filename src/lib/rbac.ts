import type { StaffRole } from "@prisma/client";

/** Capability codes used across admin APIs and UI. */
export const PERMISSIONS = [
  "dashboard.read",
  "catalog.read",
  "catalog.write",
  "orders.read",
  "orders.write",
  "stock.read",
  "stock.write",
  "branches.read",
  "branches.write",
  "staff.read",
  "staff.write",
  "customers.read",
  "customers.write",
  "content.write",
  "shipping.write",
  "settings.write",
  "enquiries.read",
  "enquiries.write",
  "notifications.read",
  "audit.read",
  "reports.read",
  "pos.read",
  "pos.write",
  "attendance.read",
  "attendance.write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS] as Permission[];

const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  COUNTRY_MANAGER: [
    "dashboard.read",
    "catalog.read",
    "orders.read",
    "orders.write",
    "stock.read",
    "stock.write",
    "branches.read",
    "staff.read",
    "customers.read",
    "customers.write",
    "enquiries.read",
    "enquiries.write",
    "notifications.read",
    "audit.read",
    "reports.read",
    "pos.read",
    "pos.write",
    "attendance.read",
    "attendance.write",
  ],
  BRANCH_MANAGER: [
    "dashboard.read",
    "catalog.read",
    "orders.read",
    "orders.write",
    "stock.read",
    "stock.write",
    "branches.read",
    "customers.read",
    "enquiries.read",
    "notifications.read",
    "audit.read",
    "reports.read",
    "pos.read",
    "pos.write",
    "attendance.read",
    "attendance.write",
  ],
  FULFILMENT: [
    "dashboard.read",
    "catalog.read",
    "orders.read",
    "orders.write",
    "stock.read",
    "stock.write",
    "notifications.read",
    "audit.read",
    "reports.read",
    "pos.read",
    "pos.write",
    "attendance.read",
  ],
  CONTENT: [
    "dashboard.read",
    "catalog.read",
    "catalog.write",
    "content.write",
    "notifications.read",
  ],
  SUPPORT: [
    "dashboard.read",
    "orders.read",
    "customers.read",
    "customers.write",
    "enquiries.read",
    "enquiries.write",
    "notifications.read",
  ],
};

export function permissionsForStaffRole(role: StaffRole | null | undefined): Permission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role] || [];
}

export function staffRoleLabel(role: StaffRole | null | undefined): string {
  switch (role) {
    case "COUNTRY_MANAGER":
      return "Country manager";
    case "BRANCH_MANAGER":
      return "Branch manager";
    case "FULFILMENT":
      return "Fulfilment";
    case "CONTENT":
      return "Content";
    case "SUPPORT":
      return "Support";
    default:
      return "Unassigned";
  }
}

export const STAFF_ROLES: StaffRole[] = [
  "COUNTRY_MANAGER",
  "BRANCH_MANAGER",
  "FULFILMENT",
  "CONTENT",
  "SUPPORT",
];

export function superAdminEmails(): string[] {
  return String(process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  const list = superAdminEmails();
  if (!list.length) return false;
  return list.includes(String(email || "").trim().toLowerCase());
}

/** Full access: env-listed Super Admins only (when configured). */
export function hasFullAdminAccess(input: {
  email?: string | null;
  role?: string | null;
  staffRole?: StaffRole | null;
}): boolean {
  if (isSuperAdminEmail(input.email)) return true;
  // Dev fallback when SUPER_ADMIN_EMAILS is unset: legacy ADMIN with no staff role.
  if (!superAdminEmails().length && input.role === "ADMIN" && !input.staffRole) {
    return true;
  }
  return false;
}

const LEGACY_ADMIN_PERMS: Permission[] = ALL.filter(
  (p) => p !== "staff.write" && p !== "branches.write"
);

export function resolvePermissions(input: {
  email?: string | null;
  role?: string | null;
  staffRole?: StaffRole | null;
}): Permission[] {
  if (input.role !== "ADMIN") return [];
  if (hasFullAdminAccess(input)) return ALL;
  if (input.staffRole) return permissionsForStaffRole(input.staffRole);
  // Existing ADMIN accounts before role assignment: operate, but cannot manage staff/branches.
  return LEGACY_ADMIN_PERMS;
}

export function hasPermission(
  perms: Permission[],
  required: Permission | Permission[]
): boolean {
  const need = Array.isArray(required) ? required : [required];
  return need.every((p) => perms.includes(p));
}
