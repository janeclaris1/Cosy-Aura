import "server-only";

import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import type { PayslipDocument, PayslipSignatory } from "@/lib/payslip-document";
import { formatPayslipSignedDate } from "@/lib/payslip-document";
import { amountInWords } from "@/lib/amount-in-words";
import {
  deductionsRows,
  earningsRows,
  employeeOfficialFields,
  paymentAccountDetails,
  paymentDatedAs,
  payslipMonthYear,
} from "@/lib/payslip-layout";

const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.35, 0.35, 0.35);
const BORDER = rgb(0.65, 0.65, 0.65);
const HEAD = rgb(0.012, 0.016, 0.369);
const HEAD_TEXT = rgb(1, 1, 1);
const TOTAL = rgb(0.93, 0.93, 0.93);
const NET = rgb(0.012, 0.016, 0.369);

function pdfSafe(text: string): string {
  return text
    .replace(/₵/g, "GHS ")
    .replace(/[–—]/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");
}

function formatMoney(amount: number, currency = "GHS"): string {
  return pdfSafe(`${currency} ${Number(amount || 0).toFixed(2)}`);
}

function centerText(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = INK
) {
  const safe = pdfSafe(text);
  const w = font.widthOfTextAtSize(safe, size);
  const { width } = page.getSize();
  page.drawText(safe, { x: (width - w) / 2, y, size, font, color });
}

function centerTextInRegion(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  xStart: number,
  xEnd: number,
  color = INK
) {
  const safe = pdfSafe(text);
  const w = font.widthOfTextAtSize(safe, size);
  const regionW = Math.max(xEnd - xStart, w);
  page.drawText(safe, {
    x: xStart + (regionW - w) / 2,
    y,
    size,
    font,
    color,
  });
}

function drawDottedLine(page: PDFPage, x1: number, x2: number, y: number) {
  const step = 4;
  let x = x1;
  while (x < x2) {
    const segEnd = Math.min(x + 2, x2);
    page.drawLine({
      start: { x, y },
      end: { x: segEnd, y },
      thickness: 1,
      color: MUTED,
    });
    x += step;
  }
}

async function drawLogoWatermark(page: PDFPage, pdf: PDFDocument) {
  try {
    const logoPath = path.join(
      process.cwd(),
      "public/images/brand/cosyaura-logo.jpg"
    );
    if (!fs.existsSync(logoPath)) return;
    const bytes = fs.readFileSync(logoPath);
    const img = await pdf.embedJpg(bytes);
    const { width, height } = page.getSize();
    const imgW = 220;
    const imgH = (img.height / img.width) * imgW;
    page.drawImage(img, {
      x: (width - imgW) / 2,
      y: (height - imgH) / 2 - 20,
      width: imgW,
      height: imgH,
      opacity: 0.08,
    });
  } catch {
    /* optional watermark */
  }
}

function drawFieldLine(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  maxW: number,
  font: PDFFont,
  bold: PDFFont
) {
  page.drawText(pdfSafe(label), { x, y, size: 9.5, font, color: INK });
  const labelW = font.widthOfTextAtSize(pdfSafe(label), 9.5);
  const startX = x + labelW + 4;
  const lineEnd = x + maxW;
  page.drawLine({
    start: { x: startX, y: y - 2 },
    end: { x: lineEnd, y: y - 2 },
    thickness: 0.5,
    color: MUTED,
    dashArray: [2, 2],
  });
  page.drawText(pdfSafe(value), {
    x: startX + 2,
    y,
    size: 9.5,
    font: bold,
    color: INK,
  });
}

export async function buildPayslipPdf(
  doc: PayslipDocument,
  accountant: PayslipSignatory
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  await drawLogoWatermark(page, pdf);

  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();
  const margin = 48;
  const contentW = width - margin * 2;
  let y = height - margin;

  centerText(page, doc.company.name.toUpperCase(), y, serifBold, 16);
  y -= 18;
  centerText(page, doc.company.addressLine, y, serif, 9, MUTED);
  y -= 14;
  if (doc.company.phone) {
    centerText(page, `Tel: ${doc.company.phone}`, y, serif, 9, MUTED);
    y -= 14;
  }
  if (doc.company.officialNumber) {
    centerText(
      page,
      `${doc.company.officialNumberLabel}: ${doc.company.officialNumber}`,
      y,
      serif,
      9,
      MUTED
    );
    y -= 14;
  }
  y -= 14;
  centerText(page, "Salary Slip", y, serifBold, 13);
  y -= 32;

  const { month, year } = payslipMonthYear(doc.payRun.periodLabel);
  drawFieldLine(
    page,
    "Employee Name:",
    doc.employee.name,
    margin,
    y,
    contentW,
    serif,
    serifBold
  );
  y -= 20;
  drawFieldLine(
    page,
    "Designation:",
    doc.employee.jobTitle || doc.employee.department || "—",
    margin,
    y,
    contentW,
    serif,
    serifBold
  );
  y -= 20;
  for (const field of employeeOfficialFields(doc)) {
    drawFieldLine(page, field.label, field.value, margin, y, contentW, serif, serifBold);
    y -= 20;
  }
  const half = contentW / 2 - 8;
  drawFieldLine(page, "Month:", month, margin, y, half, serif, serifBold);
  drawFieldLine(page, "Year:", year, margin + half + 16, y, half, serif, serifBold);
  y -= 28;

  const earn = earningsRows(doc);
  const deduct = deductionsRows(doc);
  const rows = Math.max(earn.length, deduct.length);
  const colW = contentW / 4;
  const rowH = 18;
  const tableTop = y;
  const tableH = rowH * (rows + 2) + rowH;

  // Header row
  page.drawRectangle({
    x: margin,
    y: tableTop - rowH,
    width: contentW,
    height: rowH,
    color: HEAD,
    borderColor: BORDER,
    borderWidth: 0.5,
  });
  const headers = ["Earnings", "Amount", "Deductions", "Amount"];
  headers.forEach((h, i) => {
    const hx = margin + i * colW + colW / 2 - serifBold.widthOfTextAtSize(h, 8.5) / 2;
    page.drawText(h, {
      x: hx,
      y: tableTop - rowH + 5,
      size: 8.5,
      font: serifBold,
      color: HEAD_TEXT,
    });
    if (i > 0) {
      page.drawLine({
        start: { x: margin + i * colW, y: tableTop },
        end: { x: margin + i * colW, y: tableTop - tableH },
        thickness: 0.5,
        color: BORDER,
      });
    }
  });

  const currency = doc.payRun.currency || "GHS";

  for (let r = 0; r < rows; r++) {
    const rowY = tableTop - rowH * (r + 2) + 5;
    page.drawRectangle({
      x: margin,
      y: tableTop - rowH * (r + 2),
      width: contentW,
      height: rowH,
      borderColor: BORDER,
      borderWidth: 0.5,
    });
    const cells = [
      earn[r]?.label || "",
      earn[r]?.value != null ? formatMoney(earn[r].value!, currency) : "",
      deduct[r]?.label || "",
      deduct[r]?.value != null ? formatMoney(deduct[r].value!, currency) : "",
    ];
    cells.forEach((cell, i) => {
      const safe = pdfSafe(cell);
      const tx =
        i === 1 || i === 3
          ? margin + (i + 1) * colW - 6 - sans.widthOfTextAtSize(safe, 8.5)
          : margin + i * colW + 6;
      page.drawText(safe, {
        x: tx,
        y: rowY,
        size: 8.5,
        font: sans,
        color: INK,
      });
    });
  }

  // Total row
  const totalY = tableTop - rowH * (rows + 2);
  page.drawRectangle({
    x: margin,
    y: totalY,
    width: contentW,
    height: rowH,
    color: TOTAL,
    borderColor: BORDER,
    borderWidth: 0.5,
  });
  const totalCells = [
    "Total Addition",
    formatMoney(doc.line.grossPay, currency),
    "Total Deduction",
    formatMoney(doc.line.totalDeductions, currency),
  ];
  totalCells.forEach((cell, i) => {
    const safe = pdfSafe(cell);
    const tx =
      i === 1 || i === 3
        ? margin + (i + 1) * colW - 6 - serifBold.widthOfTextAtSize(safe, 8.5)
        : margin + i * colW + 6;
    page.drawText(safe, {
      x: tx,
      y: totalY + 5,
      size: 8.5,
      font: serifBold,
      color: INK,
    });
  });

  // Net row
  const netY = totalY - rowH;
  page.drawRectangle({
    x: margin + colW * 2,
    y: netY,
    width: colW * 2,
    height: rowH,
    color: NET,
    borderColor: BORDER,
    borderWidth: 0.5,
  });
  page.drawText("NET Salary", {
    x: margin + colW * 2 + 6,
    y: netY + 5,
    size: 9,
    font: serifBold,
    color: HEAD_TEXT,
  });
  const netStr = formatMoney(doc.line.netPay, currency);
  page.drawText(netStr, {
    x: margin + colW * 4 - 6 - serifBold.widthOfTextAtSize(netStr, 9),
    y: netY + 5,
    size: 9,
    font: serifBold,
    color: HEAD_TEXT,
  });

  y = netY - 24;

  const words = pdfSafe(amountInWords(doc.line.netPay, "Ghana Cedis", "Pesewas"));
  page.drawText("Amount in words:", {
    x: margin,
    y,
    size: 9,
    font: serifBold,
    color: INK,
  });
  page.drawText(words, {
    x: margin + 88,
    y,
    size: 9,
    font: serifItalic,
    color: INK,
  });
  y -= 22;

  const halfW = contentW / 2 - 8;
  drawFieldLine(
    page,
    "Reference:",
    doc.employee.employeeNumber || doc.payRun.periodLabel,
    margin,
    y,
    halfW,
    serif,
    serifBold
  );
  drawFieldLine(
    page,
    "Dated As:",
    paymentDatedAs(doc),
    margin + halfW + 16,
    y,
    halfW,
    serif,
    serifBold
  );
  y -= 22;

  const { accountNumber, institutionName } = paymentAccountDetails(doc);
  const bankLabel = "Bank / MoMo:";
  page.drawText(bankLabel, { x: margin, y, size: 9.5, font: serif, color: INK });
  const bankLabelW = serif.widthOfTextAtSize(bankLabel, 9.5);
  const bankValX = margin + bankLabelW + 4;
  const bankLineEnd = margin + contentW;
  page.drawLine({
    start: { x: bankValX, y: y - 2 },
    end: { x: bankLineEnd, y: y - 2 },
    thickness: 0.5,
    color: MUTED,
  });
  page.drawText(pdfSafe(accountNumber), {
    x: bankValX + 2,
    y,
    size: 9.5,
    font: serifBold,
    color: INK,
  });
  const bankNameY = y - 16;
  page.drawLine({
    start: { x: bankValX, y: bankNameY - 2 },
    end: { x: bankLineEnd, y: bankNameY - 2 },
    thickness: 0.5,
    color: MUTED,
  });
  page.drawText(pdfSafe(institutionName), {
    x: bankValX + 2,
    y: bankNameY,
    size: 9.5,
    font: serifBold,
    color: INK,
  });
  y -= 56;

  const colGap = 28;
  const mid = width / 2;
  const leftStart = margin;
  const leftEnd = mid - colGap;
  const rightStart = mid + colGap;
  const rightEnd = width - margin;

  const sigLineY = y - 36;
  const labelY = sigLineY - 14;

  // Employee — blank space above line, label centred under left column
  drawDottedLine(page, leftStart, leftEnd, sigLineY);
  centerTextInRegion(
    page,
    "Employee Signature",
    labelY,
    serifItalic,
    9,
    leftStart,
    leftEnd,
    MUTED
  );

  // Accountant — name & date above line, label centred under right column
  const accName = pdfSafe(accountant.name);
  centerTextInRegion(page, accName, sigLineY + 28, serifItalic, 15, rightStart, rightEnd);
  const accMeta = pdfSafe(
    `${accountant.title} · ${formatPayslipSignedDate(accountant.signedAt)}`
  );
  centerTextInRegion(page, accMeta, sigLineY + 12, sans, 7.5, rightStart, rightEnd, MUTED);
  drawDottedLine(page, rightStart, rightEnd, sigLineY);
  centerTextInRegion(
    page,
    "Accountant",
    labelY,
    serifItalic,
    9,
    rightStart,
    rightEnd,
    MUTED
  );

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

export async function buildPayslipBatchPdf(
  docs: PayslipDocument[],
  accountant: PayslipSignatory
): Promise<Buffer> {
  if (docs.length === 1) return buildPayslipPdf(docs[0], accountant);

  const merged = await PDFDocument.create();
  for (const doc of docs) {
    const single = await PDFDocument.load(await buildPayslipPdf(doc, accountant));
    const pages = await merged.copyPages(single, single.getPageIndices());
    for (const p of pages) merged.addPage(p);
  }
  const bytes = await merged.save();
  return Buffer.from(bytes);
}
