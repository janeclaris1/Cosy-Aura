import { NextRequest, NextResponse } from "next/server";
import { checkPublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";

const ALLOWED = new Set(["fr", "es", "pt", "de"]);
const MAX_TEXT_LEN = 5000;
const MAX_CHUNKS = 12;

export async function POST(req: NextRequest) {
  if (await checkPublicRateLimit(req, "translate", 20)) {
    return rateLimitResponse();
  }

  try {
    const body = (await req.json()) as { text?: string; target?: string };
    const text = (body.text || "").trim().slice(0, MAX_TEXT_LEN);
    const target = (body.target || "").toLowerCase();

    if (!text) {
      return NextResponse.json({ text: "" });
    }
    if (!ALLOWED.has(target)) {
      return NextResponse.json({ text });
    }

    // Chunk long copy for the free MyMemory endpoint (approx 500 chars).
    const chunks: string[] = [];
    let rest = text;
    while (rest.length > 0) {
      if (rest.length <= 450) {
        chunks.push(rest);
        break;
      }
      let cut = rest.lastIndexOf(" ", 450);
      if (cut < 200) cut = 450;
      chunks.push(rest.slice(0, cut));
      rest = rest.slice(cut).trimStart();
    }

    if (chunks.length > MAX_CHUNKS) {
      return NextResponse.json({ error: "Text too long" }, { status: 400 });
    }

    const parts: string[] = [];
    for (const chunk of chunks) {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        chunk
      )}&langpair=en|${target}`;
      const res = await fetch(url, { next: { revalidate: 86400 } });
      if (!res.ok) {
        parts.push(chunk);
        continue;
      }
      const data = (await res.json()) as {
        responseData?: { translatedText?: string };
      };
      parts.push(data.responseData?.translatedText || chunk);
    }

    return NextResponse.json({ text: parts.join(" ") });
  } catch {
    return NextResponse.json({ text: "" }, { status: 500 });
  }
}
