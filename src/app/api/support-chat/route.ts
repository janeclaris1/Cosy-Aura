import { NextResponse } from "next/server";
import {
  buildStoreContext,
  enowSystemPrompt,
  fallbackAnswer,
  runSupportTool,
  SUPPORT_TOOLS,
  type ChatTurn,
  type SupportCartLine,
  type SupportCartRemoval,
  type SupportCartSnapshot,
} from "@/lib/support-agent";

const MAX_MESSAGES = 12;
const MAX_CHARS = 1200;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 24;
const MAX_TOOL_ROUNDS = 4;

const hits = new Map<string, number[]>();

type AnthropicContent =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

type AnthropicMessage = {
  role: "user" | "assistant";
  content: string | AnthropicContent[];
};

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

function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-MAX_MESSAGES)
    .map((m) => {
      const role = m?.role === "assistant" ? "assistant" : "user";
      const content = String(m?.content || "").trim().slice(0, MAX_CHARS);
      return { role, content } as ChatTurn;
    })
    .filter((m) => m.content.length > 0);
}

function toAnthropicMessages(history: ChatTurn[]): AnthropicMessage[] {
  const merged: ChatTurn[] = [];
  for (const turn of history) {
    const last = merged[merged.length - 1];
    if (last && last.role === turn.role) {
      last.content = `${last.content}\n\n${turn.content}`;
    } else {
      merged.push({ ...turn });
    }
  }
  while (merged[0]?.role === "assistant") merged.shift();
  while (merged.length && merged[merged.length - 1].role !== "user") merged.pop();
  return merged.map((m) => ({ role: m.role, content: m.content }));
}

function extractText(content: AnthropicContent[] | undefined): string {
  if (!content) return "";
  return content
    .filter((b): b is { type: "text"; text: string } => b.type === "text" && !!b.text)
    .map((b) => b.text)
    .join("\n")
    .trim();
}

async function callAnthropic(messages: AnthropicMessage[], system: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      system,
      tools: SUPPORT_TOOLS,
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Anthropic support-chat error", res.status, errText.slice(0, 500));
    return null;
  }

  return (await res.json()) as {
    stop_reason?: string;
    content?: AnthropicContent[];
  };
}

function sanitizeCart(raw: unknown): SupportCartSnapshot[] {
  if (!Array.isArray(raw)) return [];
  const out: SupportCartSnapshot[] = [];
  for (const line of raw) {
    const fragranceId = String(line?.fragranceId || "").trim();
    const slug = String(line?.slug || "").trim();
    if (!fragranceId || !slug) continue;
    const bottleSizeRaw = Number(line?.bottleSize);
    out.push({
      fragranceId,
      slug,
      brand: String(line?.brand || "").trim(),
      model: String(line?.model || "").trim(),
      ...(Number.isFinite(bottleSizeRaw) ? { bottleSize: bottleSizeRaw } : {}),
      quantity: Math.min(99, Math.max(1, Number(line?.quantity) || 1)),
      price: Number(line?.price) || 0,
    });
    if (out.length >= 20) break;
  }
  return out;
}

async function replyWithEnow(
  history: ChatTurn[],
  context: string,
  locale?: { country?: string | null; currency?: string | null; language?: string | null }
): Promise<{ text: string; cartLines: SupportCartLine[]; cartRemovals: SupportCartRemoval[] } | null> {
  const messages = toAnthropicMessages(history);
  if (!messages.length) return null;

  const system = `${enowSystemPrompt(locale?.language || "en")}\n\nLive store data for this turn:\n\n${context}`;
  const cartLines: SupportCartLine[] = [];
  const cartRemovals: SupportCartRemoval[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const data = await callAnthropic(messages, system);
    if (!data?.content) return null;

    const toolUses = data.content.filter(
      (b): b is Extract<AnthropicContent, { type: "tool_use" }> => b.type === "tool_use"
    );

    if (!toolUses.length || data.stop_reason === "end_turn") {
      const text = extractText(data.content);
      return text ? { text, cartLines, cartRemovals } : null;
    }

    messages.push({ role: "assistant", content: data.content });

    const toolResults: AnthropicContent[] = [];
    for (const tool of toolUses) {
      const { result, cartLine, cartRemoval } = await runSupportTool(
        tool.name,
        tool.input || {},
        locale
      );
      if (cartLine) cartLines.push(cartLine);
      if (cartRemoval) cartRemovals.push(cartRemoval);
      toolResults.push({
        type: "tool_result",
        tool_use_id: tool.id,
        content: result,
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return null;
}

export async function POST(req: Request) {
  try {
    if (rateLimited(clientIp(req))) {
      return NextResponse.json(
        { error: "Too many messages. Please try again in a few minutes." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const history = sanitizeHistory(body.messages);
    const locale = {
      country: typeof body.country === "string" ? body.country : null,
      currency: typeof body.currency === "string" ? body.currency : null,
      language: typeof body.language === "string" ? body.language : null,
    };
    const cart = sanitizeCart(body.cart);
    const lastUser = [...history].reverse().find((m) => m.role === "user");
    if (!lastUser) {
      return NextResponse.json({ error: "Please enter a question." }, { status: 400 });
    }

    const store = await buildStoreContext(lastUser.content, locale, cart);
    const enow = await replyWithEnow(history, store.text, locale);

    if (enow) {
      return NextResponse.json({
        reply: enow.text,
        cartLines: enow.cartLines,
        cartRemovals: enow.cartRemovals,
        source: "anthropic",
      });
    }

    return NextResponse.json({
      reply: fallbackAnswer(
        lastUser.content,
        store.matches,
        store.featured,
        locale
      ),
      cartLines: [],
      cartRemovals: [],
      source: "fallback",
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again or use /contact." },
      { status: 500 }
    );
  }
}
