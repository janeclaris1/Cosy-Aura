import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import {
  fetchAllPayslipDocuments,
  fetchPayslipDocument,
  formatPayslipPeriod,
  resolvePayslipAccountant,
} from "@/lib/payslip-document";
import { buildPayslipBatchPdf, buildPayslipPdf } from "@/lib/payslip-pdf";

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("payroll.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const payRunId = String(searchParams.get("payRunId") || "").trim();
  const lineId = String(searchParams.get("lineId") || "").trim();

  if (!payRunId) {
    return NextResponse.json({ error: "payRunId required" }, { status: 400 });
  }

  try {
    if (lineId) {
      const doc = await fetchPayslipDocument(payRunId, lineId);
      if (!doc) {
        return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
      }
      const accountant = await resolvePayslipAccountant(payRunId, {
        userId: ctx.userId,
        email: ctx.email,
      });
      const pdf = await buildPayslipPdf(doc, accountant);
      const slug = doc.employee.name.replace(/[^\w.-]+/g, "-").slice(0, 40);
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="payslip-${doc.payRun.periodLabel}-${slug}.pdf"`,
        },
      });
    }

    const docs = await fetchAllPayslipDocuments(payRunId);
    if (!docs.length) {
      return NextResponse.json({ error: "No payslips in this pay run" }, { status: 404 });
    }
    const accountant = await resolvePayslipAccountant(payRunId, {
      userId: ctx.userId,
      email: ctx.email,
    });
    const pdf = await buildPayslipBatchPdf(docs, accountant);
    const period = formatPayslipPeriod(docs[0].payRun.periodLabel);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="payslips-${period.replace(/\s+/g, "-")}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[payslip pdf]", err);
    return NextResponse.json({ error: "Could not generate PDF" }, { status: 500 });
  }
}
