import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { AccountingReportExportId } from "@/lib/accounting-report-export-url";
import {
  FINANCIAL_REPORT_COMPANY,
  FINANCIAL_REPORT_CURRENCY,
  formatReportAmount,
  formatReportPeriodLabel,
} from "@/lib/accounting-report-format";
import type { FinancialReportLine } from "@/lib/accounting-report-lines";
import type { LoadedReportDocument } from "@/lib/accounting-report-server";

const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.35, 0.35, 0.35);
const BLUE = rgb(0.18, 0.45, 0.71);
const RULE = rgb(0.55, 0.55, 0.55);

const REPORT_TITLES: Record<AccountingReportExportId, string> = {
  pl: "Profit & Loss Statement",
  trend: "Profit & Loss Trends",
  balance: "Balance Sheet",
  cashflow: "Cash Flow Statement",
  ratios: "Financial Ratios",
  trial: "Trial Balance",
};

function pdfSafe(text: string): string {
  return text
    .replace(/[–—]/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");
}

function formatCell(value: number | null | undefined, format?: FinancialReportLine["format"]) {
  if (value == null) return "-";
  if (format === "ratio") return value.toFixed(2);
  if (format === "percent") return `${value.toFixed(2)}%`;
  return formatReportAmount(value, { dashZero: false });
}

function periodSubtitle(doc: LoadedReportDocument): string {
  if (doc.report === "trend" && doc.trendMonths) {
    return `${doc.trendMonths} months ending ${formatReportPeriodLabel(doc.month)}`;
  }
  if (doc.report === "balance") {
    return formatReportPeriodLabel(doc.month, "as-of");
  }
  return formatReportPeriodLabel(doc.month);
}

function drawReportSection(
  page: PDFPage,
  fonts: { serif: PDFFont; sans: PDFFont; sansBold: PDFFont },
  doc: LoadedReportDocument,
  startY: number
): number {
  const { width, height } = page.getSize();
  const margin = 48;
  const labelWidth = width - margin * 2 - doc.columnLabels.length * 72;
  let y = startY;

  page.drawText(pdfSafe(REPORT_TITLES[doc.report]), {
    x: margin,
    y,
    size: 16,
    font: fonts.serif,
    color: INK,
  });
  y -= 18;
  for (const line of [FINANCIAL_REPORT_COMPANY, `in ${FINANCIAL_REPORT_CURRENCY}`, periodSubtitle(doc)]) {
    page.drawText(pdfSafe(line), { x: margin, y, size: 9, font: fonts.sans, color: MUTED });
    y -= 12;
  }
  y -= 8;

  const colWidth = 72;
  let xCol = width - margin - colWidth * doc.columnLabels.length;
  for (const label of doc.columnLabels) {
    const text = pdfSafe(label);
    const tw = fonts.sansBold.widthOfTextAtSize(text, 8);
    page.drawText(text, {
      x: xCol + colWidth - tw - 2,
      y,
      size: 8,
      font: fonts.sansBold,
      color: INK,
    });
    xCol += colWidth;
  }
  y -= 6;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.75,
    color: RULE,
  });
  y -= 14;

  for (const line of doc.lines) {
    if (y < margin + 40) break;

    if (line.kind === "note") {
      page.drawText(pdfSafe(line.label), {
        x: margin,
        y,
        size: 8,
        font: fonts.sans,
        color: MUTED,
      });
      y -= 14;
      continue;
    }

    let indent = 0;
    let font = fonts.sans;
    if (line.kind === "section") font = fonts.sansBold;
    if (line.kind === "subsection") {
      font = fonts.sansBold;
      indent = 12;
    }
    if (line.kind === "item") indent = 24;
    if (line.kind === "subtotal" || line.kind === "total" || line.kind === "grand-total") {
      font = fonts.sansBold;
      page.drawLine({
        start: { x: margin, y: y + 10 },
        end: { x: width - margin, y: y + 10 },
        thickness: line.kind === "grand-total" ? 1 : 0.5,
        color: RULE,
      });
      if (line.kind === "grand-total") {
        page.drawLine({
          start: { x: margin, y: y + 7 },
          end: { x: width - margin, y: y + 7 },
          thickness: 0.5,
          color: RULE,
        });
      }
    }

    const label = pdfSafe(line.label);
    page.drawText(label.slice(0, 64), {
      x: margin + indent,
      y,
      size: 9,
      font,
      color: INK,
    });

    const showAmounts =
      line.kind === "item" ||
      line.kind === "subtotal" ||
      line.kind === "total" ||
      line.kind === "grand-total";

    if (showAmounts) {
      let cx = width - margin - colWidth * doc.columnLabels.length;
      line.amounts.forEach((amount, idx) => {
        if (idx >= doc.columnLabels.length) return;
        const text = pdfSafe(formatCell(amount, line.format));
        const tw = fonts.sans.widthOfTextAtSize(text, 9);
        page.drawText(text, {
          x: cx + colWidth - tw - 2,
          y,
          size: 9,
          font: line.kind === "item" ? fonts.sans : fonts.sansBold,
          color: BLUE,
        });
        cx += colWidth;
      });
    }

    y -= line.kind === "section" ? 16 : 13;
  }

  y -= 8;
  page.drawText(pdfSafe(doc.footer), {
    x: margin,
    y: Math.max(margin, y),
    size: 7,
    font: fonts.sans,
    color: MUTED,
  });

  return y;
}

export async function renderReportPdf(doc: LoadedReportDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  drawReportSection(page, { serif, sans, sansBold }, doc, page.getSize().height - 48);

  pdf.setTitle(pdfSafe(`${REPORT_TITLES[doc.report]} — ${FINANCIAL_REPORT_COMPANY}`));
  pdf.setAuthor(FINANCIAL_REPORT_COMPANY);
  return pdf.save();
}

export async function renderReportPackPdf(
  docs: LoadedReportDocument[],
  year: number
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonts = { serif, sans, sansBold };

  const cover = pdf.addPage([595.28, 841.89]);
  const { height } = cover.getSize();
  cover.drawText(pdfSafe("Year-end financial reports"), {
    x: 48,
    y: height - 72,
    size: 20,
    font: serif,
    color: INK,
  });
  cover.drawText(pdfSafe(FINANCIAL_REPORT_COMPANY), {
    x: 48,
    y: height - 96,
    size: 11,
    font: sans,
    color: MUTED,
  });
  cover.drawText(pdfSafe(`Year ${year} · in ${FINANCIAL_REPORT_CURRENCY}`), {
    x: 48,
    y: height - 112,
    size: 11,
    font: sans,
    color: MUTED,
  });

  for (const doc of docs) {
    const page = pdf.addPage([595.28, 841.89]);
    drawReportSection(page, fonts, doc, page.getSize().height - 48);
  }

  pdf.setTitle(pdfSafe(`Year-end reports ${year} — ${FINANCIAL_REPORT_COMPANY}`));
  return pdf.save();
}
