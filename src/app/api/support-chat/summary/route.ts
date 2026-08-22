import { NextResponse } from "next/server";
import { notifySupportChatSummary } from "@/lib/support-chat-summary";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 12;
const hits = new Map<string, number[]>();

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_HITS) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function POST(req: Request) {
  try {
    if (rateLimited(clientIp(req))) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const body = await req.json().catch(() => ({}));
    const sessionId = String(body.sessionId || "").slice(0, 80);
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const result = await notifySupportChatSummary({
      sessionId,
      turns: messages.slice(-24),
      contact:
        body.contact && typeof body.contact === "object"
          ? {
              email: String(body.contact.email || "").slice(0, 120) || undefined,
              whatsapp: String(body.contact.whatsapp || "").slice(0, 40) || undefined,
            }
          : null,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[support-chat/summary]", error);
    return NextResponse.json({ ok: false, error: "Could not send summary" }, { status: 500 });
  }
}
