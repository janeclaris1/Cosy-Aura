/** Cookie used by admin UI to remember “act as branch”. */
export const ADMIN_BRANCH_COOKIE = "ca_admin_branch";

export function readAdminBranchCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_BRANCH_COOKIE}=`));
  if (!match) return null;
  const value = decodeURIComponent(match.split("=").slice(1).join("=") || "");
  return value || null;
}

export function writeAdminBranchCookie(branchId: string | null) {
  if (typeof document === "undefined") return;
  if (!branchId) {
    document.cookie = `${ADMIN_BRANCH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `${ADMIN_BRANCH_COOKIE}=${encodeURIComponent(branchId)}; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`;
}

export function transferApprovalThreshold(): number {
  const n = Number(process.env.TRANSFER_APPROVAL_THRESHOLD);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
}
