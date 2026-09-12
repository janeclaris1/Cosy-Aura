import Image from "next/image";
import type { PayslipDocument, PayslipSignatory } from "@/lib/payslip-document";
import { formatPayslipSignedDate } from "@/lib/payslip-document";
import { amountInWords } from "@/lib/amount-in-words";
import {
  PAYSLIP_LOGO_SRC,
  deductionsRows,
  earningsRows,
  employeeOfficialFields,
  paymentAccountDetails,
  paymentDatedAs,
  payslipMonthYear,
} from "@/lib/payslip-layout";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

function FieldLine({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("payslip-field-line", className)}>
      <span className="label">{label}</span>
      <span className="value">{value || "\u00A0"}</span>
    </div>
  );
}

function BankMoMoField({ doc }: { doc: PayslipDocument }) {
  const { accountNumber, institutionName } = paymentAccountDetails(doc);
  return (
    <div className="payslip-bank-block">
      <span className="payslip-bank-label">Bank / MoMo:</span>
      <div className="payslip-bank-values">
        <div className="payslip-stacked-value">{accountNumber}</div>
        <div className="payslip-stacked-value payslip-stacked-value--secondary">
          {institutionName}
        </div>
      </div>
    </div>
  );
}

function formatAmt(value: number | null, currency: string) {
  if (value == null) return "";
  return formatPrice(value, currency);
}

export function PayslipSheet({
  doc,
  accountant,
  className,
  pageBreakAfter = false,
}: {
  doc: PayslipDocument;
  accountant: PayslipSignatory;
  className?: string;
  pageBreakAfter?: boolean;
}) {
  const currency = doc.payRun.currency || "GHS";
  const { month, year } = payslipMonthYear(doc.payRun.periodLabel);
  const earn = earningsRows(doc);
  const deduct = deductionsRows(doc);
  const rowCount = Math.max(earn.length, deduct.length);
  const officialFields = employeeOfficialFields(doc);

  return (
    <article
      className={cn(
        "payslip-classic mx-auto max-w-[680px] border border-stone-300 p-8 sm:p-10 print:border-0 print:p-0 print:max-w-none print:break-inside-avoid shadow-sm print:shadow-none",
        pageBreakAfter && "print:break-after-page mb-10 print:mb-0",
        className
      )}
    >
      <div className="payslip-watermark" aria-hidden>
        <Image
          src={PAYSLIP_LOGO_SRC}
          alt=""
          width={320}
          height={320}
          className="opacity-[0.07]"
          priority
        />
      </div>

      <div className="payslip-classic-body">
        {/* Letterhead */}
        <header className="text-center mb-6">
          <h1 className="font-playfair text-2xl sm:text-[1.75rem] font-bold tracking-wide text-[#1a1a1a] uppercase">
            {doc.company.name}
          </h1>
          <p className="text-sm text-stone-600 mt-1">{doc.company.addressLine}</p>
          {doc.company.phone ? (
            <p className="text-sm text-stone-600 mt-1">
              Tel:{" "}
              <span className="font-semibold text-stone-800">{doc.company.phone}</span>
            </p>
          ) : null}
          {doc.company.officialNumber ? (
            <p className="text-sm text-stone-600 mt-1">
              {doc.company.officialNumberLabel}:{" "}
              <span className="font-semibold text-stone-800">
                {doc.company.officialNumber}
              </span>
            </p>
          ) : null}
          <h2 className="text-lg font-bold mt-5 tracking-wide">Salary Slip</h2>
        </header>

        {/* Employee fields */}
        <section className="mb-6 max-w-lg">
          <FieldLine label="Employee Name:" value={doc.employee.name} />
          <FieldLine
            label="Designation:"
            value={doc.employee.jobTitle || doc.employee.department || "—"}
          />
          {officialFields.map((field) => (
            <FieldLine key={field.label} label={field.label} value={field.value} />
          ))}
          <div className="grid grid-cols-2 gap-x-6">
            <FieldLine label="Month:" value={month} />
            <FieldLine label="Year:" value={year} />
          </div>
        </section>

        {/* Earnings / Deductions table */}
        <table className="payslip-table mb-5">
          <thead>
            <tr>
              <th className="desc">Earnings</th>
              <th className="amount">Amount</th>
              <th className="desc">Deductions</th>
              <th className="amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr key={i}>
                <td className="desc">{earn[i]?.label || ""}</td>
                <td className="amount">{formatAmt(earn[i]?.value ?? null, currency)}</td>
                <td className="desc">{deduct[i]?.label || ""}</td>
                <td className="amount">{formatAmt(deduct[i]?.value ?? null, currency)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td className="desc">Total Addition</td>
              <td className="amount">{formatPrice(doc.line.grossPay, currency)}</td>
              <td className="desc">Total Deduction</td>
              <td className="amount">{formatPrice(doc.line.totalDeductions, currency)}</td>
            </tr>
            <tr className="net-row">
              <td colSpan={2} />
              <td className="desc">NET Salary</td>
              <td className="amount">{formatPrice(doc.line.netPay, currency)}</td>
            </tr>
          </tbody>
        </table>

        {/* Amount in words & payment */}
        <section className="text-sm space-y-3 mb-2">
          <p>
            <span className="font-semibold">Amount in words: </span>
            <span className="italic">
              {amountInWords(doc.line.netPay, "Ghana Cedis", "Pesewas")}
            </span>
          </p>
          <div className="payslip-payment-footer pt-2">
            <div className="payslip-payment-row">
              <FieldLine
                label="Reference:"
                value={doc.employee.employeeNumber || doc.payRun.periodLabel}
                className="payslip-payment-half"
              />
              <FieldLine
                label="Dated As:"
                value={paymentDatedAs(doc)}
                className="payslip-payment-half"
              />
            </div>
            <BankMoMoField doc={doc} />
          </div>
        </section>

        {/* Signatures */}
        <div className="payslip-signatures">
          <div>
            <div className="h-10" />
            <div className="sig-line">Employee Signature</div>
          </div>
          <div className="text-center">
            <p className="payslip-signature-script min-h-[2.5rem]">{accountant.name}</p>
            <p className="text-xs text-stone-600 -mt-1 mb-1">
              {accountant.title} · {formatPayslipSignedDate(accountant.signedAt)}
            </p>
            <div className="sig-line">Accountant</div>
          </div>
        </div>
      </div>
    </article>
  );
}
