import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  formatReceiptMoney,
  receiptDeliveryLabel,
  receiptFilename,
  receiptItemsTotal,
  receiptShortId,
  receiptTrackUrl,
  type ReceiptOrder,
} from "./order-receipt";

const IVORY = rgb(0.973, 0.957, 0.933);
const ESPRESSO = rgb(0.11, 0.098, 0.09);
const GOLD = rgb(0.651, 0.486, 0.322);
const MUTED = rgb(0.42, 0.4, 0.38);
const LINE = rgb(0.82, 0.78, 0.72);
const ROW = rgb(0.945, 0.925, 0.898);

const RECEIPT_SITE_URL = "https://cosyaura.com";

function pdfSafe(text: string): string {
  return text
    .replace(/₵/g, "")
    .replace(/[--]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
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
  return lines.length ? lines : [text];
}

function drawRight(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  xRight: number,
  y: number,
  color = ESPRESSO
) {
  const safe = pdfSafe(text);
  const w = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: xRight - w, y, size, font, color });
}

export async function buildOrderReceiptPdf(order: ReceiptOrder): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 48;
  const contentRight = width - margin;
  const shortId = receiptShortId(order.id);
  const trackUrl = receiptTrackUrl(order, RECEIPT_SITE_URL);

  page.drawRectangle({ x: 0, y: 0, width, height, color: IVORY });
  page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: GOLD });
  page.drawRectangle({ x: 0, y: 0, width, height: 8, color: GOLD });

  try {
    const logoBytes = await readFile(
      path.join(process.cwd(), "public/images/brand/ca-monogram.png")
    );
    const logo = await pdf.embedPng(logoBytes);
    page.drawImage(logo, {
      x: margin,
      y: height - 92,
      width: 52,
      height: 36,
    });
  } catch {
    page.drawText("CA", {
      x: margin,
      y: height - 78,
      size: 22,
      font: serifBold,
      color: ESPRESSO,
    });
  }

  page.drawText("COSY AURA", {
    x: margin + 62,
    y: height - 70,
    size: 18,
    font: serifBold,
    color: ESPRESSO,
  });
  page.drawText("Oil-based perfume atelier", {
    x: margin + 62,
    y: height - 86,
    size: 9,
    font: sans,
    color: MUTED,
  });

  drawRight(page, "PAYMENT RECEIPT", sansBold, 9, contentRight, height - 64, GOLD);
  drawRight(page, `#${shortId}`, serifBold, 16, contentRight, height - 84);

  let y = height - 118;
  page.drawLine({
    start: { x: margin, y },
    end: { x: contentRight, y },
    thickness: 0.6,
    color: LINE,
  });

  y -= 22;
  const paidOn = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(order.createdAt);

  page.drawText("Date", { x: margin, y, size: 8, font: sans, color: MUTED });
  page.drawText("Status", { x: margin + 160, y, size: 8, font: sans, color: MUTED });
  page.drawText("Customer", { x: margin + 280, y, size: 8, font: sans, color: MUTED });
  y -= 14;
  page.drawText(pdfSafe(paidOn), { x: margin, y, size: 10, font: sansBold, color: ESPRESSO });
  page.drawText((order.status || "PAID").toUpperCase(), {
    x: margin + 160,
    y,
    size: 10,
    font: sansBold,
    color: GOLD,
  });
  const emailLines = wrap(sans, order.email || "-", 10, 220);
  page.drawText(emailLines[0], {
    x: margin + 280,
    y,
    size: 10,
    font: sans,
    color: ESPRESSO,
  });

  y -= 28;
  page.drawRectangle({
    x: margin,
    y: y - 6,
    width: contentRight - margin,
    height: 22,
    color: ROW,
  });
  page.drawText("ITEM", { x: margin + 10, y, size: 8, font: sansBold, color: MUTED });
  page.drawText("QTY", { x: margin + 360, y, size: 8, font: sansBold, color: MUTED });
  drawRight(page, "AMOUNT", sansBold, 8, contentRight - 10, y, MUTED);

  y -= 24;
  for (const item of order.items) {
    const name = `${item.brand} ${item.model}`;
    const nameLines = wrap(sans, name, 10, 330);
    const blockHeight = Math.max(18, nameLines.length * 13 + (item.reference ? 12 : 0));
    if (y - blockHeight < 220) break;

    nameLines.forEach((line, i) => {
      page.drawText(line, {
        x: margin + 10,
        y: y - i * 13,
        size: 10,
        font: sans,
        color: ESPRESSO,
      });
    });
    if (item.reference) {
      page.drawText(pdfSafe(`Ref. ${item.reference}`), {
        x: margin + 10,
        y: y - nameLines.length * 13,
        size: 8,
        font: sans,
        color: MUTED,
      });
    }
    page.drawText(String(item.quantity), {
      x: margin + 366,
      y,
      size: 10,
      font: sans,
      color: ESPRESSO,
    });
    drawRight(
      page,
      formatReceiptMoney(item.price * item.quantity),
      sans,
      10,
      contentRight - 10,
      y
    );
    y -= blockHeight + 8;
  }

  y -= 6;
  page.drawLine({
    start: { x: margin, y },
    end: { x: contentRight, y },
    thickness: 0.6,
    color: LINE,
  });

  const subtotal = receiptItemsTotal(order);
  y -= 20;
  page.drawText("Subtotal", { x: margin + 300, y, size: 10, font: sans, color: MUTED });
  drawRight(page, formatReceiptMoney(subtotal), sans, 10, contentRight - 10, y);

  y -= 16;
  page.drawText("Shipping", { x: margin + 300, y, size: 10, font: sans, color: MUTED });
  drawRight(
    page,
    order.shippingCost > 0 ? formatReceiptMoney(order.shippingCost) : "Included",
    sans,
    10,
    contentRight - 10,
    y
  );
  if (order.shippingMethod) {
    y -= 12;
    page.drawText(pdfSafe(order.shippingMethod), {
      x: margin + 300,
      y,
      size: 8,
      font: sans,
      color: MUTED,
    });
  }

  y -= 22;
  page.drawText("Total paid", {
    x: margin + 300,
    y,
    size: 12,
    font: serifBold,
    color: ESPRESSO,
  });
  drawRight(page, formatReceiptMoney(order.total), serifBold, 13, contentRight - 10, y, GOLD);

  y -= 28;
  page.drawLine({
    start: { x: margin, y },
    end: { x: contentRight, y },
    thickness: 0.6,
    color: LINE,
  });

  y -= 22;
  page.drawText("Deliver to", { x: margin, y, size: 8, font: sansBold, color: GOLD });
  page.drawText("Delivery date", {
    x: margin + 300,
    y,
    size: 8,
    font: sansBold,
    color: GOLD,
  });

  y -= 14;
  const address = [
    order.shippingName,
    order.shippingAddress,
    [order.shippingCity, order.shippingPostcode].filter(Boolean).join(" "),
    order.shippingCountry,
  ].filter(Boolean) as string[];

  let addrY = y;
  if (address.length === 0) {
    page.drawText("Address collected at checkout", {
      x: margin,
      y: addrY,
      size: 10,
      font: sans,
      color: MUTED,
    });
  } else {
    for (const line of address) {
      page.drawText(pdfSafe(line), { x: margin, y: addrY, size: 10, font: sans, color: ESPRESSO });
      addrY -= 13;
    }
  }

  const delivery = receiptDeliveryLabel(order) || "Monday to Saturday";
  page.drawText(pdfSafe(delivery), {
    x: margin + 300,
    y,
    size: 10,
    font: sansBold,
    color: ESPRESSO,
  });
  page.drawText("Monday - Saturday", {
    x: margin + 300,
    y: y - 14,
    size: 8,
    font: sans,
    color: MUTED,
  });

  y = Math.min(addrY, y - 36) - 16;
  page.drawText("Track your order", {
    x: margin,
    y,
    size: 8,
    font: sansBold,
    color: GOLD,
  });
  y -= 13;
  const trackLines = wrap(sans, trackUrl, 8, contentRight - margin);
  for (const line of trackLines) {
    page.drawText(line, { x: margin, y, size: 8, font: sans, color: ESPRESSO });
    y -= 11;
  }

  page.drawText("Thank you for your order.", {
    x: margin,
    y: 42,
    size: 11,
    font: serif,
    color: ESPRESSO,
  });
  page.drawText("support@cosyaura.com  ·  cosyaura.com", {
    x: margin,
    y: 28,
    size: 8,
    font: sans,
    color: MUTED,
  });

  pdf.setTitle(`COSY AURA Receipt #${shortId}`);
  pdf.setAuthor("COSY AURA");
  pdf.setSubject("Payment receipt");

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

export { receiptFilename };
