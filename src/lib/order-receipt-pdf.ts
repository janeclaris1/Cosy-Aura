import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  formatReceiptMoney,
  receiptBillToLines,
  receiptFilename,
  receiptItemsTotal,
  receiptShipToLines,
  receiptShortId,
  type ReceiptOrder,
} from "./order-receipt";
import { buildReceiptTaxBreakdown } from "./pos-taxes";
import { receiptCompanyLetterhead, type ReceiptAddressBlock } from "./receipt-company";

const NAVY = rgb(3 / 255, 4 / 255, 94 / 255);
const GOLD = rgb(1, 210 / 255, 0);
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const MUTED = rgb(0.35, 0.35, 0.35);
const ROW_ALT = rgb(0.96, 0.97, 0.995);

const STORE_NAME = "COSY AURA";

function pdfSafe(text: string): string {
  return text
    .replace(/₵/g, "")
    .replace(/[–—]/g, "-")
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");
}

function wrap(
  font: PDFFont,
  text: string,
  size: number,
  maxWidth: number
): string[] {
  const words = pdfSafe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [pdfSafe(text)];
}

function drawCentered(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  centerX: number,
  y: number,
  color = BLACK
) {
  const safe = pdfSafe(text);
  const w = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: centerX - w / 2, y, size, font, color });
}

function drawRight(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  xRight: number,
  y: number,
  color = BLACK
) {
  const safe = pdfSafe(text);
  const w = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: xRight - w, y, size, font, color });
}

function drawAddressBlock(
  page: PDFPage,
  block: ReceiptAddressBlock,
  x: number,
  y: number,
  align: "left" | "right",
  maxWidth: number,
  sans: PDFFont,
  sansBold: PDFFont
): number {
  const lineHeight = 11;
  let cy = y;

  const nameLines = wrap(sansBold, block.name, 9, maxWidth);
  for (const line of nameLines) {
    if (align === "right") drawRight(page, line, sansBold, 9, x, cy, NAVY);
    else page.drawText(line, { x, y: cy, size: 9, font: sansBold, color: NAVY });
    cy -= lineHeight;
  }

  for (const raw of block.lines) {
    const lines = wrap(sans, raw, 8, maxWidth);
    for (const line of lines) {
      if (align === "right") drawRight(page, line, sans, 8, x, cy, MUTED);
      else page.drawText(line, { x, y: cy, size: 8, font: sans, color: MUTED });
      cy -= lineHeight;
    }
  }

  return y - cy;
}

function drawLetterheadAddresses(
  page: PDFPage,
  margin: number,
  contentRight: number,
  y: number,
  sans: PDFFont,
  sansBold: PDFFont
): number {
  const letterhead = receiptCompanyLetterhead();
  const colWidth = (contentRight - margin) * 0.42;

  const leftHeight = drawAddressBlock(
    page,
    letterhead.us,
    margin,
    y,
    "left",
    colWidth,
    sans,
    sansBold
  );
  const rightHeight = drawAddressBlock(
    page,
    letterhead.gh,
    contentRight,
    y,
    "right",
    colWidth,
    sans,
    sansBold
  );

  return Math.max(leftHeight, rightHeight);
}

function measureCustomerDetailColumn(
  lines: string[],
  maxWidth: number,
  sans: PDFFont
): number {
  const lineHeight = 12;
  let height = lineHeight + 2;
  for (const raw of lines) {
    height += wrap(sans, raw, 9, maxWidth).length * lineHeight;
  }
  return height;
}

function drawCustomerDetailColumn(
  page: PDFPage,
  title: string,
  lines: string[],
  x: number,
  y: number,
  maxWidth: number,
  sans: PDFFont,
  sansBold: PDFFont
) {
  const lineHeight = 12;
  let cy = y;

  page.drawText(pdfSafe(title), { x, y: cy, size: 9, font: sansBold, color: NAVY });
  cy -= lineHeight + 2;

  for (const raw of lines) {
    for (const line of wrap(sans, raw, 9, maxWidth)) {
      page.drawText(line, { x, y: cy, size: 9, font: sans, color: BLACK });
      cy -= lineHeight;
    }
  }
}

function drawCustomerDetailsSection(
  page: PDFPage,
  order: ReceiptOrder,
  margin: number,
  contentWidth: number,
  topY: number,
  sans: PDFFont,
  sansBold: PDFFont
): number {
  const pad = 12;
  const colGap = 16;
  const innerWidth = contentWidth - pad * 2;
  const colWidth = (innerWidth - colGap) / 2;
  const leftX = margin + pad;
  const rightX = leftX + colWidth + colGap;
  const bodyTop = topY - 22;

  const billLines = receiptBillToLines(order);
  const shipLines = receiptShipToLines(order);
  const bodyHeight = Math.max(
    measureCustomerDetailColumn(billLines, colWidth, sans),
    measureCustomerDetailColumn(shipLines, colWidth, sans)
  );
  const sectionHeight = bodyHeight + 28;

  page.drawRectangle({
    x: margin,
    y: topY - sectionHeight,
    width: contentWidth,
    height: sectionHeight,
    color: WHITE,
    borderColor: NAVY,
    borderWidth: 0.75,
  });

  page.drawLine({
    start: { x: margin + contentWidth / 2, y: topY },
    end: { x: margin + contentWidth / 2, y: topY - sectionHeight },
    thickness: 0.75,
    color: NAVY,
  });

  drawCustomerDetailColumn(page, "Bill To", billLines, leftX, bodyTop, colWidth, sans, sansBold);
  drawCustomerDetailColumn(page, "Ship To", shipLines, rightX, bodyTop, colWidth, sans, sansBold);

  return sectionHeight;
}

type TotalsLine = {
  label: string;
  value: string;
  muted?: boolean;
};

function drawReceiptTotalsPanel(
  page: PDFPage,
  topY: number,
  margin: number,
  contentRight: number,
  contentWidth: number,
  lines: TotalsLine[],
  totalLabel: string,
  totalValue: string,
  sans: PDFFont,
  sansBold: PDFFont
): number {
  const panelWidth = contentWidth * 0.48;
  const panelLeft = contentRight - panelWidth;
  const padX = 12;
  const labelX = panelLeft + padX;
  const valueX = contentRight - padX;
  const rowHeight = 16;
  const totalBandHeight = 30;
  const bodyRows = lines.length;
  const bodyHeight = bodyRows * rowHeight + 14;
  const panelBottom = topY - bodyHeight - totalBandHeight;
  const panelHeight = topY - panelBottom;

  page.drawRectangle({
    x: panelLeft,
    y: panelBottom,
    width: panelWidth,
    height: panelHeight,
    color: ROW_ALT,
    borderColor: NAVY,
    borderWidth: 0.75,
  });

  let rowY = topY - 12;
  for (const line of lines) {
    page.drawText(pdfSafe(line.label), {
      x: labelX,
      y: rowY,
      size: line.muted ? 9 : 10,
      font: sans,
      color: line.muted ? MUTED : BLACK,
    });
    drawRight(
      page,
      line.value,
      sans,
      line.muted ? 9 : 10,
      valueX,
      rowY,
      line.muted ? MUTED : BLACK
    );
    rowY -= rowHeight;
  }

  const bandTop = panelBottom + totalBandHeight;

  page.drawRectangle({
    x: panelLeft,
    y: panelBottom,
    width: panelWidth,
    height: totalBandHeight,
    color: NAVY,
  });

  page.drawRectangle({
    x: panelLeft,
    y: bandTop - 2,
    width: panelWidth,
    height: 2,
    color: GOLD,
  });

  const totalTextY = panelBottom + 10;
  page.drawText(pdfSafe(totalLabel), {
    x: labelX,
    y: totalTextY,
    size: 11,
    font: sansBold,
    color: WHITE,
  });
  drawRight(page, totalValue, sansBold, 13, valueX, totalTextY, WHITE);

  return panelBottom;
}

function receiptInvoiceNumber(order: ReceiptOrder): string {
  return order.receiptNumber || receiptShortId(order.id);
}

function receiptCustomerName(order: ReceiptOrder): string {
  const name = order.shippingName?.trim();
  if (name) return name;
  const email = order.email?.trim();
  if (email && email.includes("@")) return email.split("@")[0];
  return email || "-";
}

function receiptDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export async function buildOrderReceiptPdf(order: ReceiptOrder): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 56;
  const contentRight = width - margin;
  const contentWidth = contentRight - margin;
  const centerX = width / 2;

  let y = height - margin;

  page.drawRectangle({
    x: 0,
    y: height - 4,
    width,
    height: 4,
    color: GOLD,
  });

  drawCentered(page, STORE_NAME, serifBold, 22, centerX, y, NAVY);
  y -= 20;
  drawCentered(page, "Official Receipt", sans, 11, centerX, y, MUTED);
  y -= 22;

  const addressHeight = drawLetterheadAddresses(page, margin, contentRight, y, sans, sansBold);
  y -= addressHeight + 24;

  const metaTop = y;
  const metaHeight = 42;
  const colWidth = contentWidth / 3;
  const col1 = margin;
  const col2 = margin + colWidth;
  const col3 = margin + colWidth * 2;

  page.drawRectangle({
    x: margin,
    y: metaTop - metaHeight,
    width: contentWidth,
    height: metaHeight,
    color: ROW_ALT,
    borderColor: NAVY,
    borderWidth: 0.75,
  });
  page.drawLine({
    start: { x: col2, y: metaTop },
    end: { x: col2, y: metaTop - metaHeight },
    thickness: 0.75,
    color: NAVY,
  });
  page.drawLine({
    start: { x: col3, y: metaTop },
    end: { x: col3, y: metaTop - metaHeight },
    thickness: 0.75,
    color: NAVY,
  });

  const metaLabelY = metaTop - 16;
  const metaValueY = metaTop - 32;
  drawCentered(page, "Date", sansBold, 8, col1 + colWidth / 2, metaLabelY, NAVY);
  drawCentered(page, "Invoice #", sansBold, 8, col2 + colWidth / 2, metaLabelY, NAVY);
  drawCentered(page, "Customer Name", sansBold, 8, col3 + colWidth / 2, metaLabelY, NAVY);

  drawCentered(page, receiptDateLabel(order.createdAt), sans, 10, col1 + colWidth / 2, metaValueY, BLACK);
  drawCentered(page, receiptInvoiceNumber(order), sans, 10, col2 + colWidth / 2, metaValueY, BLACK);
  const customerLines = wrap(sans, receiptCustomerName(order), 10, colWidth - 16);
  drawCentered(page, customerLines[0], sans, 10, col3 + colWidth / 2, metaValueY);

  y = metaTop - metaHeight - 20;

  const customerSectionTop = y;
  const customerSectionHeight = drawCustomerDetailsSection(
    page,
    order,
    margin,
    contentWidth,
    customerSectionTop,
    sans,
    sansBold
  );
  y = customerSectionTop - customerSectionHeight - 24;

  const tableTop = y;
  const rowHeight = 22;
  const headerHeight = 24;
  const colProduct = margin + 8;
  const colQty = margin + contentWidth * 0.52;
  const colUnit = margin + contentWidth * 0.68;
  const colTotal = contentRight - 8;

  const qtyHeader = "QTY";
  const unitHeader = "UNIT PRICE";
  const totalHeader = "TOTAL";

  page.drawRectangle({
    x: margin,
    y: tableTop - headerHeight,
    width: contentWidth,
    height: headerHeight,
    color: NAVY,
    borderColor: NAVY,
    borderWidth: 0.75,
  });

  page.drawText("PRODUCT", {
    x: colProduct,
    y: tableTop - 16,
    size: 8,
    font: sansBold,
    color: WHITE,
  });
  page.drawText(qtyHeader, {
    x: colQty,
    y: tableTop - 16,
    size: 8,
    font: sansBold,
    color: WHITE,
  });
  page.drawText(unitHeader, {
    x: colUnit,
    y: tableTop - 16,
    size: 8,
    font: sansBold,
    color: WHITE,
  });
  drawRight(page, totalHeader, sansBold, 8, colTotal, tableTop - 16, WHITE);

  let rowY = tableTop - headerHeight;
  let rowIndex = 0;
  for (const item of order.items) {
    const name = `${item.brand} ${item.model}`;
    const nameLines = wrap(sans, name, 9, contentWidth * 0.48);
    const currentRowHeight = Math.max(rowHeight, nameLines.length * 12 + 10);
    rowY -= currentRowHeight;

    if (rowY < 180) break;

    page.drawRectangle({
      x: margin,
      y: rowY,
      width: contentWidth,
      height: currentRowHeight,
      color: rowIndex % 2 === 1 ? ROW_ALT : WHITE,
      borderColor: NAVY,
      borderWidth: 0.75,
    });
    rowIndex += 1;

    const textY = rowY + currentRowHeight - 14;
    nameLines.forEach((line, i) => {
      page.drawText(line, {
        x: colProduct,
        y: textY - i * 12,
        size: 9,
        font: sans,
        color: BLACK,
      });
    });

    page.drawText(String(item.quantity), {
      x: colQty,
      y: textY,
      size: 9,
      font: sans,
      color: BLACK,
    });
    page.drawText(formatReceiptMoney(item.price), {
      x: colUnit,
      y: textY,
      size: 9,
      font: sans,
      color: BLACK,
    });
    drawRight(
      page,
      formatReceiptMoney(item.price * item.quantity),
      sans,
      9,
      colTotal,
      textY
    );
  }

  y = rowY - 20;

  const subtotal = receiptItemsTotal(order);
  const receiptTax = buildReceiptTaxBreakdown(order.total, order.shippingCountry);
  const totalsLines: TotalsLine[] = [
    { label: "Subtotal", value: formatReceiptMoney(subtotal) },
  ];

  if (order.shippingCost > 0) {
    totalsLines.push({
      label: "Shipping",
      value: formatReceiptMoney(order.shippingCost),
    });
  }

  if (receiptTax.showGhanaLevies) {
    totalsLines.push(
      { label: "VAT (15%)", value: formatReceiptMoney(receiptTax.breakdown.vat), muted: true },
      { label: "NHIL (2.5%)", value: formatReceiptMoney(receiptTax.breakdown.nhil), muted: true },
      {
        label: "GETFUND (2.5%)",
        value: formatReceiptMoney(receiptTax.breakdown.getfund),
        muted: true,
      }
    );
  }

  const panelBottom = drawReceiptTotalsPanel(
    page,
    y,
    margin,
    contentRight,
    contentWidth,
    totalsLines,
    "TOTAL",
    formatReceiptMoney(order.total),
    sans,
    sansBold
  );

  drawCentered(
    page,
    "Thank you for your purchase!",
    serif,
    12,
    centerX,
    Math.max(56, panelBottom - 28),
    NAVY
  );

  pdf.setTitle(`${STORE_NAME} Receipt #${receiptInvoiceNumber(order)}`);
  pdf.setAuthor(STORE_NAME);
  pdf.setSubject("Official receipt");

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

export { receiptFilename };
