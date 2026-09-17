import {
  type CheckoutAbandonmentItem,
  sanitizeAbandonmentItems,
} from "@/lib/checkout-abandonment";
import { sendEmail } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000";

const MAX_RECOVERY_EMAILS = 1;
const DEFAULT_DELAY_MINUTES = 60;
const MAX_AGE_DAYS = 7;

function recoveryDelayMs(): number {
  const minutes = Number(process.env.ABANDONED_CHECKOUT_RECOVERY_DELAY_MINUTES);
  const value = Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_DELAY_MINUTES;
  return value * 60 * 1000;
}

function emailShell(title: string, body: string) {
  return `<!DOCTYPE html>
<html><body style="font-family:Georgia,serif;color:#1A1A1A;max-width:560px;margin:0 auto;padding:24px;">
  <p style="letter-spacing:2px;font-size:14px;color:#03045e;margin:0 0 8px;">COSY AURA</p>
  <h1 style="font-size:24px;margin:0 0 16px;">${title}</h1>
  ${body}
  <p style="margin-top:32px;font-size:12px;color:#666;">Questions? Reply to this email or visit ${SITE_URL}/contact</p>
</body></html>`;
}

function itemsHtml(items: CheckoutAbandonmentItem[]) {
  return items
    .map((item) => {
      const label = [item.brand, item.model].filter(Boolean).join(" ") || "Item";
      const size =
        item.bottleSize != null ? `<br/><span style="color:#666;font-size:12px;">Size: ${item.bottleSize} ml</span>` : "";
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">${label}${size}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">
          ${formatPrice(item.price)} × ${item.quantity}
        </td>
      </tr>`;
    })
    .join("");
}

export function checkoutRecoveryUrl(recoveryToken: string): string {
  return `${SITE_URL.replace(/\/$/, "")}/checkout?recover=${encodeURIComponent(recoveryToken)}`;
}

export async function sendCheckoutAbandonmentRecoveryEmail(
  abandonmentId: string,
  options?: { force?: boolean }
): Promise<{ ok: boolean; reason?: string; skipped?: boolean }> {
  const row = await prisma.checkoutAbandonment.findUnique({
    where: { id: abandonmentId },
    include: { order: { select: { status: true } } },
  });

  if (!row) return { ok: false, reason: "Not found" };
  if (row.status !== "ACTIVE") {
    return { ok: false, reason: "Already converted", skipped: true };
  }
  if (row.order?.status === "PAID") {
    return { ok: false, reason: "Order already paid", skipped: true };
  }

  if (!options?.force) {
    if (row.recoveryEmailCount >= MAX_RECOVERY_EMAILS) {
      return { ok: false, reason: "Recovery email already sent", skipped: true };
    }
    const delayMs = recoveryDelayMs();
    if (Date.now() - row.lastSeenAt.getTime() < delayMs) {
      return { ok: false, reason: "Too soon after last activity", skipped: true };
    }
  }

  const items = sanitizeAbandonmentItems(row.items);
  if (!items?.length) return { ok: false, reason: "Empty cart" };

  const greeting = row.customerName?.trim()
    ? `Hi ${row.customerName.trim().split(/\s+/)[0]},`
    : "Hi there,";
  const recoveryUrl = checkoutRecoveryUrl(row.recoveryToken);
  const currency = row.displayCurrency || "GHS";

  const html = emailShell(
    "Your checkout is waiting",
    `<p>${greeting}</p>
     <p>You started an order with COSY AURA but didn't finish checkout. Your selections are saved — pick up where you left off.</p>
     <table style="width:100%;border-collapse:collapse;margin:16px 0;">${itemsHtml(items)}</table>
     <p style="margin:16px 0;"><strong>Subtotal: ${formatPrice(row.subtotalGhs, currency)}</strong></p>
     <p style="margin:24px 0;">
       <a href="${recoveryUrl}" style="background:#03045e;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;display:inline-block;">
         Complete my order
       </a>
     </p>
     <p style="font-size:13px;color:#666;">If the button doesn't work, copy this link:<br/>
     <a href="${recoveryUrl}" style="color:#03045e;word-break:break-all;">${recoveryUrl}</a></p>`
  );

  const result = await sendEmail({
    to: row.email,
    subject: "Complete your COSY AURA order",
    html,
  });

  if (!result.ok) {
    return { ok: false, reason: result.error || "Email failed" };
  }

  await prisma.checkoutAbandonment.update({
    where: { id: row.id },
    data: {
      recoveryEmailedAt: new Date(),
      recoveryEmailCount: { increment: 1 },
    },
  });

  return { ok: true };
}

export async function processAutomaticCheckoutRecoveryEmails(): Promise<{
  scanned: number;
  sent: number;
  skipped: number;
  failed: number;
}> {
  const delayMs = recoveryDelayMs();
  const readyBefore = new Date(Date.now() - delayMs);
  const staleAfter = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

  const candidates = await prisma.checkoutAbandonment.findMany({
    where: {
      status: "ACTIVE",
      recoveryEmailCount: { lt: MAX_RECOVERY_EMAILS },
      lastSeenAt: { lte: readyBefore, gte: staleAfter },
      OR: [{ orderId: null }, { order: { status: "PENDING" } }],
    },
    orderBy: { lastSeenAt: "asc" },
    take: 40,
    select: { id: true },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of candidates) {
    const result = await sendCheckoutAbandonmentRecoveryEmail(row.id);
    if (result.ok) sent += 1;
    else if (result.skipped) skipped += 1;
    else failed += 1;
  }

  return { scanned: candidates.length, sent, skipped, failed };
}

export type RecoveredCartItem = CheckoutAbandonmentItem & {
  slug: string;
  image: string;
};

export async function loadRecoveredCheckoutCart(
  recoveryToken: string
): Promise<
  | {
      ok: true;
      email: string;
      subtotalGhs: number;
      items: RecoveredCartItem[];
    }
  | { ok: false; reason: string }
> {
  const token = recoveryToken.trim();
  if (!token) return { ok: false, reason: "Invalid link" };

  const row = await prisma.checkoutAbandonment.findUnique({
    where: { recoveryToken: token },
  });

  if (!row || row.status !== "ACTIVE") {
    return { ok: false, reason: "This recovery link is no longer valid" };
  }

  const items = sanitizeAbandonmentItems(row.items);
  if (!items?.length) return { ok: false, reason: "Cart is empty" };

  const fragranceIds = [...new Set(items.map((item) => item.fragranceId))];
  const fragrances = await prisma.fragrance.findMany({
    where: { id: { in: fragranceIds } },
    select: {
      id: true,
      slug: true,
      model: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      brand: { select: { name: true } },
    },
  });

  const byId = new Map(fragrances.map((f) => [f.id, f]));
  const enriched: RecoveredCartItem[] = [];

  for (const item of items) {
    const product = byId.get(item.fragranceId);
    if (!product) continue;
    enriched.push({
      ...item,
      brand: item.brand || product.brand.name,
      model: item.model || product.model,
      slug: product.slug,
      image: product.images[0]?.url || "",
    });
  }

  if (!enriched.length) {
    return { ok: false, reason: "Items are no longer available" };
  }

  return {
    ok: true,
    email: row.email,
    subtotalGhs: row.subtotalGhs,
    items: enriched,
  };
}

export function isCronAuthorized(req: Request): boolean {
  const secret =
    process.env.CRON_SECRET?.trim() ||
    process.env.HEALTH_CHECK_TOKEN?.trim();
  if (!secret) return false;
  const authHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return Boolean(authHeader && authHeader === secret);
}
