/** Shared employer letterhead for payslips and HR documents (Ghana-first). */

export type HrCompanyLetterhead = {
  name: string;
  addressLine: string;
  phone: string | null;
  email: string | null;
  tin: string | null;
  tinLabel: string;
  ssnitEmployerNo: string | null;
  registrationNo: string | null;
  footerWording: string;
};

export function hrCompanyLetterhead(country = "GH"): HrCompanyLetterhead {
  const code = String(country || "GH")
    .trim()
    .toUpperCase();

  const tinLabel = code === "CM" ? "NIF" : "TIN";
  const tin =
    (code === "GH"
      ? process.env.COMPANY_TIN_GH
      : code === "CM"
        ? process.env.COMPANY_TIN_CM
        : process.env[`COMPANY_TIN_${code}`])?.trim() ||
    process.env.COMPANY_TIN?.trim() ||
    null;

  return {
    name:
      (code === "GH"
        ? process.env.COMPANY_GH_LEGAL_NAME || process.env.COMPANY_LEGAL_NAME
        : process.env.COMPANY_LEGAL_NAME)?.trim() || "COSY AURA LTD, Accra Ghana",
    addressLine:
      process.env.COMPANY_ADDRESS?.trim() ||
      "15 Odaw Street, Kokomlemle, Accra, Ghana",
    phone:
      process.env.COMPANY_PHONE_GH?.trim() ||
      process.env.COMPANY_PHONE?.trim() ||
      process.env.DAWUROBO_PICKUP_PHONE?.trim() ||
      null,
    email: process.env.COMPANY_EMAIL?.trim() || "info@cosyaura.com",
    tin,
    tinLabel,
    ssnitEmployerNo: process.env.COMPANY_SSNIT_EMPLOYER_NO?.trim() || null,
    registrationNo:
      process.env.COMPANY_REGISTRATION_NO?.trim() ||
      process.env.COMPANY_OFFICIAL_NUMBER?.trim() ||
      null,
    footerWording:
      process.env.HR_DOCUMENT_FOOTER?.trim() ||
      "This document is issued by the employer for internal HR records. Final legal review recommended before external use.",
  };
}

export function letterheadRegistrationLines(head: HrCompanyLetterhead): string[] {
  const lines: string[] = [];
  if (head.tin) lines.push(`${head.tinLabel}: ${head.tin}`);
  if (head.ssnitEmployerNo) lines.push(`SSNIT Employer No.: ${head.ssnitEmployerNo}`);
  if (head.registrationNo) lines.push(`Registration No.: ${head.registrationNo}`);
  return lines;
}
