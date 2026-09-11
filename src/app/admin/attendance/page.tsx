import { requireAdminPage } from "@/lib/admin";
import { AttendanceDashboard } from "@/components/admin/AttendanceDashboard";
import { AttendanceAbsenceReport } from "@/components/admin/AttendanceAbsenceReport";
import { AttendanceReport } from "@/components/admin/AttendanceReport";
import { AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";

export default async function AdminAttendancePage() {
  await requireAdminPage("attendance.read");

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Operations"
        title="Staff attendance"
        description="Track shop presence from fingerprint terminals and manual clock-in/out punches."
      />
      <AttendanceDashboard />
      <AttendanceAbsenceReport />
      <AttendanceReport />
    </div>
  );
}
