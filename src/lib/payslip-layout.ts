import type { PayslipDocument } from "@/lib/payslip-document";
import { formatPayslipSignedDate } from "@/lib/payslip-document";

export const PAYSLIP_LOGO_SRC = "/images/brand/cosyaura-logo.jpg";

export type PayslipTableRow = { label: string; value: number | null };

export function payslipMonthYear(periodLabel: string): { month: string; year: string } {
  const [y, m] = periodLabel.split("-").map(Number);
  if (!y || !m) return { month: periodLabel, year: "" };
  const month = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    timeZone: "UTC",
  });
  return { month, year: String(y) };
}

export function earningsRows(doc: PayslipDocument): PayslipTableRow[] {
  const { line } = doc;
  const rows: PayslipTableRow[] = [
    { label: "Basic salary", value: line.basicSalary },
    { label: "Allowances", value: line.allowances },
  ];
  if (line.overtime > 0) rows.push({ label: "Overtime", value: line.overtime });
  if (line.bonus > 0) rows.push({ label: "Bonus", value: line.bonus });
  return padRows(rows, 5);
}

export function deductionsRows(doc: PayslipDocument): PayslipTableRow[] {
  const { line } = doc;
  const rows: PayslipTableRow[] = [
    { label: "PAYE", value: line.paye },
    { label: "SSNIT (employee)", value: line.ssnitEmployee },
  ];
  if (line.otherDeductions > 0) {
    rows.push({ label: "Other deductions", value: line.otherDeductions });
  }
  return padRows(rows, 5);
}

export function padRows(rows: PayslipTableRow[], min: number): PayslipTableRow[] {
  const copy = [...rows];
  while (copy.length < min) copy.push({ label: "", value: null });
  return copy;
}

export function paymentAccountDetails(doc: PayslipDocument): {
  accountNumber: string;
  institutionName: string;
} {
  const p = doc.payment;

  if (p.method === "MOMO") {
    return {
      accountNumber: p.momoNumber || "—",
      institutionName: p.momoProvider || "Mobile money",
    };
  }

  if (p.method === "BANK") {
    return {
      accountNumber: p.bankAccountNo || "—",
      institutionName: p.bankName || "Bank transfer",
    };
  }

  if (p.bankAccountNo || p.bankName) {
    return {
      accountNumber: p.bankAccountNo || "—",
      institutionName: p.bankName || "Bank transfer",
    };
  }

  if (p.momoNumber || p.momoProvider) {
    return {
      accountNumber: p.momoNumber || "—",
      institutionName: p.momoProvider || "Mobile money",
    };
  }

  return { accountNumber: "—", institutionName: "Cash" };
}

/** @deprecated Use paymentAccountDetails for stacked account + bank layout */
export function paymentBankLabel(doc: PayslipDocument): string {
  const { accountNumber, institutionName } = paymentAccountDetails(doc);
  return `${accountNumber}\n${institutionName}`;
}

export function paymentDatedAs(doc: PayslipDocument): string {
  if (doc.payRun.paidAt) return formatPayslipSignedDate(doc.payRun.paidAt);
  return formatPayslipSignedDate(new Date());
}

export type PayslipOfficialField = { label: string; value: string };

/** Employee tax / national IDs for the payslip country. */
export function employeeOfficialFields(doc: PayslipDocument): PayslipOfficialField[] {
  const { employee, payRun } = doc;
  const country = payRun.country.trim().toUpperCase();
  const fields: PayslipOfficialField[] = [];

  if (country === "GH") {
    if (employee.ghanaCardId) {
      fields.push({ label: "Ghana Card No.:", value: employee.ghanaCardId });
    }
    if (employee.tin) fields.push({ label: "TIN:", value: employee.tin });
    if (employee.ssnitNumber) {
      fields.push({ label: "SSNIT No.:", value: employee.ssnitNumber });
    }
    return fields;
  }

  if (employee.tin) fields.push({ label: "TIN:", value: employee.tin });
  return fields;
}
