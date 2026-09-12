import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { PayslipPrintActions } from "@/components/admin/PayslipPrintActions";
import { PayslipSheet } from "@/components/admin/PayslipSheet";
import {
  fetchPayslipDocument,
  resolvePayslipAccountant,
} from "@/lib/payslip-document";

export default async function PayslipPrintPage({
  params,
}: {
  params: { payRunId: string; lineId: string };
}) {
  const ctx = await requireAdminPage("payroll.read");

  const doc = await fetchPayslipDocument(params.payRunId, params.lineId);
  if (!doc) notFound();

  const accountant = await resolvePayslipAccountant(params.payRunId, {
    userId: ctx.userId,
    email: ctx.email,
  });

  const pdfHref = `/api/admin/hr/payroll/payslip?payRunId=${encodeURIComponent(params.payRunId)}&lineId=${encodeURIComponent(params.lineId)}`;
  const backHref = `/admin/hr?tab=payroll`;

  return (
    <div className="max-w-4xl mx-auto">
      <PayslipPrintActions pdfHref={pdfHref} backHref={backHref} />
      <PayslipSheet doc={doc} accountant={accountant} />
    </div>
  );
}
