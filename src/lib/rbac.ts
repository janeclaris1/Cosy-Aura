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
  "hr.read",
  "hr.write",
  "hr.self.read",
  "payroll.read",
  "payroll.write",
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
    "hr.self.read",
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
    "hr.self.read",
  ],
  HR: [
    "dashboard.read",
    "staff.read",
    "hr.read",
    "hr.write",
    "hr.self.read",
    "notifications.read",
    "audit.read",
    "reports.read",
    "attendance.read",
  ],
  ACCOUNTANT: [
    "dashboard.read",
    "hr.read",
    "hr.self.read",
    "payroll.read",
    "payroll.write",
    "attendance.read",
    "reports.read",
    "audit.read",
    "notifications.read",
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
    "hr.self.read",
  ],
  CONTENT: [
    "dashboard.read",
    "catalog.read",
    "catalog.write",
    "content.write",
    "notifications.read",
    "hr.self.read",
  ],
  SUPPORT: [
    "dashboard.read",
    "orders.read",
    "customers.read",
    "customers.write",
    "enquiries.read",
    "enquiries.write",
    "notifications.read",
    "hr.self.read",
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
    case "HR":
      return "HR";
    case "ACCOUNTANT":
      return "Accountant";
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

export function staffRoleDescription(role: StaffRole | null | undefined): string {
  switch (role) {
    case "HR":
      return "Employee records, leave approvals, and staff list (country-scoped).";
    case "ACCOUNTANT":
      return "Payroll runs, payslips, and payroll exports (country-scoped).";
    case "COUNTRY_MANAGER":
      return "Full country operations — orders, stock, POS, and staff invites.";
    case "BRANCH_MANAGER":
      return "Single-branch operations — orders, stock, and POS.";
    case "FULFILMENT":
      return "Pick, pack, and branch stock for assigned branches.";
    case "CONTENT":
      return "Catalogue and journal content.";
    case "SUPPORT":
      return "Orders, customers, and enquiries.";
    default:
      return "";
  }
}

/** Grouped options for the staff role picker (People roles listed first). */
export const STAFF_ROLE_GROUPS: { label: string; roles: StaffRole[] }[] = [
  { label: "People & finance", roles: ["HR", "ACCOUNTANT"] },
  {
    label: "Operations",
    roles: ["COUNTRY_MANAGER", "BRANCH_MANAGER", "FULFILMENT"],
  },
  { label: "Other", roles: ["CONTENT", "SUPPORT"] },
];

/** Roles scoped to a single country (GH / CM). */
export const COUNTRY_SCOPED_STAFF_ROLES: StaffRole[] = [
  "COUNTRY_MANAGER",
  "HR",
  "ACCOUNTANT",
];

export function staffRoleNeedsCountry(role: StaffRole | string | null | undefined): boolean {
  return COUNTRY_SCOPED_STAFF_ROLES.includes(role as StaffRole);
}

export const STAFF_ROLES: StaffRole[] = [
  "COUNTRY_MANAGER",
  "BRANCH_MANAGER",
  "HR",
  "ACCOUNTANT",
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

/** True when the user has at least one of the listed permissions. */
export function hasAnyPermission(
  perms: Permission[],
  required: Permission[]
): boolean {
  return required.some((p) => perms.includes(p));
}

export function canAccessNavItem(
  perms: Permission[],
  required?: Permission | Permission[],
  match?: "all" | "any"
): boolean {
  if (!required) return true;
  const list = Array.isArray(required) ? required : [required];
  if (match === "any") return hasAnyPermission(perms, list);
  return hasPermission(perms, list);
}
