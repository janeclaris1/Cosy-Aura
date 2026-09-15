/** Letterhead addresses for PDF receipts (US left, Ghana right). */

export type ReceiptAddressBlock = {
  name: string;
  lines: string[];
};

export type ReceiptCompanyLetterhead = {
  us: ReceiptAddressBlock;
  gh: ReceiptAddressBlock;
};

function splitAddressEnv(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split("|")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function receiptCompanyLetterhead(): ReceiptCompanyLetterhead {
  const email = process.env.COMPANY_EMAIL?.trim() || "info@cosyaura.com";
  const usLines = splitAddressEnv(process.env.COMPANY_ADDRESS_US);
  const ghLines = splitAddressEnv(process.env.COMPANY_ADDRESS_GH);

  const ghPhone =
    process.env.COMPANY_PHONE_GH?.trim() ||
    process.env.COMPANY_PHONE?.trim() ||
    "+233 (0) 3024584837 | +233 (0) 504171323";

  const us: ReceiptAddressBlock = {
    name: process.env.COMPANY_US_LEGAL_NAME?.trim() || "COSY AURA LLC, WY USA",
    lines:
      usLines.length > 0
        ? usLines
        : [
            "30 N Gould St Ste R",
            "Sheridan, WY 82801",
            "United States",
            email,
          ],
  };

  const gh: ReceiptAddressBlock = {
    name:
      process.env.COMPANY_GH_LEGAL_NAME?.trim() ||
      process.env.COMPANY_LEGAL_NAME?.trim() ||
      "COSY AURA LTD, Accra Ghana",
    lines:
      ghLines.length > 0
        ? ghLines
        : [
            process.env.COMPANY_ADDRESS?.trim() ||
              "15 Odaw Street, Kokomlemle, Accra",
            ghPhone,
            email,
          ],
  };

  const tinGh = process.env.COMPANY_TIN_GH?.trim();
  if (tinGh && !gh.lines.some((l) => l.includes(tinGh))) {
    gh.lines.push(`TIN: ${tinGh}`);
  }

  return { us, gh };
}
