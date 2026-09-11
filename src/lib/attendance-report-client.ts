/** Client-safe helpers for attendance report UI (no Prisma / server imports). */

export function attendanceReportExportUrl(params: {
  branchId?: string;
  from?: string;
  to?: string;
}) {
  const sp = new URLSearchParams({ kind: "attendance" });
  if (params.branchId) sp.set("branchId", params.branchId);
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  return `/api/admin/reports/export?${sp.toString()}`;
}

export function attendanceAbsenceExportUrl(params: {
  branchId?: string;
  month?: string;
  fromMonth?: string;
  toMonth?: string;
}) {
  const sp = new URLSearchParams({ kind: "attendance-absences" });
  if (params.branchId) sp.set("branchId", params.branchId);
  if (params.month) sp.set("month", params.month);
  if (params.fromMonth) sp.set("fromMonth", params.fromMonth);
  if (params.toMonth) sp.set("toMonth", params.toMonth);
  return `/api/admin/reports/export?${sp.toString()}`;
}
