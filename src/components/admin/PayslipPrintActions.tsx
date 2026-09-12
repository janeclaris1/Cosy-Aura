"use client";

import { Download, Printer } from "lucide-react";
import { AdminButton } from "@/components/admin/admin-ui";

export function PayslipPrintActions({
  pdfHref,
  backHref,
  backLabel = "← Back to payroll",
}: {
  pdfHref: string;
  backHref: string;
  backLabel?: string;
}) {
  return (
    <div className="print:hidden flex flex-wrap items-center justify-between gap-3 mb-6">
      <a href={backHref} className="text-sm text-[#03045e] hover:underline">
        {backLabel}
      </a>
      <div className="flex flex-wrap gap-2">
        <AdminButton
          type="button"
          variant="secondary"
          className="gap-1.5"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          Print
        </AdminButton>
        <AdminButton href={pdfHref} variant="secondary" className="gap-1.5">
          <Download className="h-4 w-4" />
          Download PDF
        </AdminButton>
      </div>
    </div>
  );
}
