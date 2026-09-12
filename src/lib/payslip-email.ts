import "server-only";

import { sendEmail } from "@/lib/notifications";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function siteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function formatMoney(amount: number, currency = "GHS"): string {
  const code = (currency || "GHS").toUpperCase();
  try {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: code,
      currencyDisplay: code === "GHS" ? "narrowSymbol" : "code",
    }).format(Number(amount || 0));
  } catch {
    return `${code} ${Number(amount || 0).toFixed(2)}`;
  }
}

function formatPeriodLabel(periodLabel: string): string {
  const [y, m] = periodLabel.split("-").map(Number);
  if (!y || !m) return periodLabel;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export type PayslipEmailLine = {
  userId: string;
  basicSalary: number;
  allowances: number;
  grossPay: number;
  paye: number;
  ssnitEmployee: number;
  totalDeductions: number;
  netPay: number;
  presentDays: number;
  workingDays: number;
  proRateFactor: number;
  staff: { name: string | null; email: string } | null;
};

export type PayslipEmailPayRun = {
  periodLabel: string;
  country: string;
  currency: string;
  branch: { name: string } | null;
  lines: PayslipEmailLine[];
};

export function buildPayslipEmailHtml(input: {
  payRun: PayslipEmailPayRun;
  line: PayslipEmailLine;
}): string {
  const { payRun, line } = input;
  const name = line.staff?.name || "there";
  const period = formatPeriodLabel(payRun.periodLabel);
  const branch = payRun.branch?.name || "All branches";
  const currency = payRun.currency || "GHS";
  const myHrUrl = `${siteBaseUrl()}/admin/my-hr`;

  const rows = [
    ["Basic salary", formatMoney(line.basicSalary, currency)],
    ["Allowances", formatMoney(line.allowances, currency)],
    ["Gross pay", formatMoney(line.grossPay, currency)],
    ["PAYE", formatMoney(line.paye, currency)],
    ["SSNIT (employee)", formatMoney(line.ssnitEmployee, currency)],
    ["Total deductions", formatMoney(line.totalDeductions, currency)],
    ["Net pay", formatMoney(line.netPay, currency)],
  ];

  const attendance =
    line.workingDays > 0
      ? `${line.presentDays} of ${line.workingDays} working days${
          line.proRateFactor < 1
            ? ` (${Math.round(line.proRateFactor * 100)}% pro-rated)`
            : ""
        }`
      : "Not recorded for this period";

  const tableRows = rows
    .map(
      ([label, value], index) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee;color:#555;font-size:14px;">${escapeHtml(label)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;font-size:14px;${
            index === rows.length - 1 ? "font-weight:700;color:#03045e;font-size:16px;" : "color:#1A1A1A;"
          }">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<body style="font-family:Georgia,serif;color:#1A1A1A;max-width:560px;margin:0 auto;padding:24px;background:#fafafa;">
  <div style="background:#fff;padding:28px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <p style="letter-spacing:2px;font-size:13px;color:#03045e;margin:0 0 8px;">COSY AURA</p>
    <h1 style="font-size:22px;margin:0 0 6px;color:#03045e;">Your payslip — ${escapeHtml(period)}</h1>
    <p style="font-size:14px;color:#666;margin:0 0 24px;">Hi ${escapeHtml(name)}, your salary for this period has been paid.</p>

    <table style="width:100%;margin-bottom:20px;font-size:13px;color:#666;">
      <tr><td style="padding:4px 0;">Period</td><td style="text-align:right;color:#1A1A1A;">${escapeHtml(period)}</td></tr>
      <tr><td style="padding:4px 0;">Branch</td><td style="text-align:right;color:#1A1A1A;">${escapeHtml(branch)}</td></tr>
      <tr><td style="padding:4px 0;">Country</td><td style="text-align:right;color:#1A1A1A;">${escapeHtml(payRun.country)}</td></tr>
      <tr><td style="padding:4px 0;">Attendance</td><td style="text-align:right;color:#1A1A1A;">${escapeHtml(attendance)}</td></tr>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      ${tableRows}
    </table>

    <p style="font-size:13px;color:#666;margin:0 0 20px;">
      A copy is also available in your HR portal. If anything looks wrong, contact your HR team.
    </p>

    <a href="${escapeHtml(myHrUrl)}" style="display:inline-block;background:#03045e;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;font-size:14px;">
      View in My HR
    </a>
  </div>
  <p style="font-size:11px;color:#999;text-align:center;margin-top:16px;">
    This payslip was sent automatically when payroll was marked as paid. Please do not reply to this email.
  </p>
</body>
</html>`;
}

export async function sendPayslipEmailsForPayRun(
  payRun: PayslipEmailPayRun
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const period = formatPeriodLabel(payRun.periodLabel);
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const line of payRun.lines) {
    const email = line.staff?.email?.trim();
    if (!email) {
      failed += 1;
      errors.push(`Missing email for employee ${line.userId}`);
      continue;
    }

    const html = buildPayslipEmailHtml({ payRun, line });
    const result = await sendEmail({
      to: email,
      subject: `Your ${period} payslip — Cosy Aura`,
      html,
    });

    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
      errors.push(`${email}: ${result.error || "send failed"}`);
    }
  }

  return { sent, failed, errors };
}
