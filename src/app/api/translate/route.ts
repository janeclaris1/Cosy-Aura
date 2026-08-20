import { NextRequest, NextResponse } from "next/server";

const ALLOWED = new Set(["fr", "es", "pt", "de"]);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { text?: string; target?: string };
    const text = (body.text || "").trim();
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
