import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { PayslipPrintActions } from "@/components/admin/PayslipPrintActions";
import { PayslipSheet } from "@/components/admin/PayslipSheet";
import {
  fetchAllPayslipDocuments,
  formatPayslipPeriod,
  resolvePayslipAccountant,
} from "@/lib/payslip-document";

export default async function PayslipBatchPrintPage({
  params,
}: {
  params: { payRunId: string };
}) {
  const ctx = await requireAdminPage("payroll.read");

  const docs = await fetchAllPayslipDocuments(params.payRunId);
  if (!docs.length) notFound();

  const accountant = await resolvePayslipAccountant(params.payRunId, {
    userId: ctx.userId,
    email: ctx.email,
  });

  const period = formatPayslipPeriod(docs[0].payRun.periodLabel);
  const pdfHref = `/api/admin/hr/payroll/payslip?payRunId=${encodeURIComponent(params.payRunId)}`;
  const backHref = `/admin/hr?tab=payroll`;

  return (
    <div className="max-w-4xl mx-auto">
      <PayslipPrintActions
        pdfHref={pdfHref}
        backHref={backHref}
        backLabel={`← Back to payroll · ${period}`}
      />
      <p className="print:hidden text-sm text-mocha mb-6">
        {docs.length} payslip{docs.length === 1 ? "" : "s"} — each prints on a
        separate page. Accountant details are filled automatically.
      </p>
      <div className="space-y-0">
        {docs.map((doc, index) => (
          <PayslipSheet
            key={doc.line.id}
            doc={doc}
            accountant={accountant}
            pageBreakAfter={index < docs.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
