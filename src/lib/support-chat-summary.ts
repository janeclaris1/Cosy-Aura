import {
  getAdminNotificationEmails,
  sendEmail,
} from "@/lib/notifications";
import { sendWhatsAppText } from "@/lib/whatsapp";

export type SupportSummaryTurn = { role: "user" | "assistant"; content: string };

const sentHashes = new Map<string, number>();
const DEDUPE_MS = 60 * 60 * 1000;

function pruneSent() {
  const cutoff = Date.now() - DEDUPE_MS;
  for (const [key, at] of sentHashes) {
    if (at < cutoff) sentHashes.delete(key);
  }
}

export function supportSummaryHash(sessionId: string, turns: SupportSummaryTurn[]): string {
  const body = turns
    .map((t) => `${t.role}:${t.content.trim()}`)
    .join("\n")
    .slice(0, 8000);
  return `${sessionId}:${body.length}:${body.slice(0, 240)}:${body.slice(-240)}`;
}

function customerTurns(turns: SupportSummaryTurn[]): SupportSummaryTurn[] {
  return turns.filter((t) => t.role === "user" && t.content.trim());
}

export function hasCustomerChat(turns: SupportSummaryTurn[]): boolean {
  return customerTurns(turns).length > 0;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[[^\]]+\]\(([^)]+)\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSupportChatSummary(turns: SupportSummaryTurn[]): {
  subject: string;
  text: string;
  html: string;
} {
  const shopper = customerTurns(turns);
  const firstAsk = shopper[0]?.content.trim().slice(0, 140) || "Support chat";
  const lastAsk = shopper[shopper.length - 1]?.content.trim().slice(0, 180) || "";
  const recs = turns
    .filter((t) => t.role === "assistant")
    .flatMap((t) => [...t.content.matchAll(/\[([^\]]+)\]\(\/fragrances\/[^)]+\)/g)])
    .map((m) => m[1])
    .filter((name, i, all) => all.indexOf(name) === i)
    .slice(0, 6);

  const bullets = [
    `Messages: ${shopper.length} from shopper`,
    `First ask: ${firstAsk}`,
    lastAsk && lastAsk !== firstAsk ? `Latest ask: ${lastAsk}` : "",
    recs.length ? `Oils mentioned: ${recs.join(", ")}` : "",
  ].filter(Boolean);

  const transcript = turns
    .map((t) => `${t.role === "user" ? "Shopper" : "Enow"}: ${stripMarkdown(t.content)}`)
    .join("\n\n");

  const subject = `Enow chat: ${firstAsk.slice(0, 70)}`;
  const text = `Cosy Aura support chat summary\n\n${bullets.join("\n")}\n\nTranscript\n${transcript}`.slice(
    0,
    3500
  );

  const htmlTurns = turns
    .map((t) => {
      const who = t.role === "user" ? "Shopper" : "Enow";
      const body = stripMarkdown(t.content)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<p><strong>${who}:</strong> ${body}</p>`;
    })
    .join("");

  const html = `
    <p>A shopper just finished chatting with Enow.</p>
    <ul>${bullets.map((b) => `<li>${b.replace(/&/g, "&amp;")}</li>`).join("")}</ul>
    <h3>Transcript</h3>
    ${htmlTurns}
  `;

  return { subject, text, html };
}

export async function notifySupportChatSummary(input: {
  sessionId: string;
  turns: SupportSummaryTurn[];
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const turns = input.turns
    .map((t) => ({
      role: t.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: String(t.content || "").trim().slice(0, 1200),
    }))
    .filter((t) => t.content);

  if (!hasCustomerChat(turns)) {
    return { ok: true, skipped: true };
  }

  pruneSent();
  const hash = supportSummaryHash(input.sessionId || "anon", turns);
  if (sentHashes.has(hash)) {
    return { ok: true, skipped: true };
  }
  sentHashes.set(hash, Date.now());

  const { subject, text, html } = buildSupportChatSummary(turns);
  const emails = process.env.SUPPORT_SUMMARY_EMAIL
    ? process.env.SUPPORT_SUMMARY_EMAIL.split(/[,;]/)
        .map((entry) => entry.trim())
        .filter((entry) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry))
    : getAdminNotificationEmails();
  const whatsappTo = process.env.SUPPORT_SUMMARY_WHATSAPP?.trim() || undefined;

  const [emailResult, whatsappResult] = await Promise.all([
    emails.length
      ? sendEmail({ to: emails, subject, html })
      : Promise.resolve({ ok: false as const, error: "No summary email recipients" }),
    sendWhatsAppText(text.slice(0, 1500), whatsappTo),
  ]);

  if (!emailResult.ok && !whatsappResult.ok) {
    sentHashes.delete(hash);
    return {
      ok: false,
      error: emailResult.error || whatsappResult.error || "Could not send summary",
    };
  }

  if (!emailResult.ok) {
    console.error("[support-chat-summary] email", emailResult.error);
  }
  if (!whatsappResult.ok) {
    console.error("[support-chat-summary] whatsapp", whatsappResult.error);
  }

  return { ok: true };
}
