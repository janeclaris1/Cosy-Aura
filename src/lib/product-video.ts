export type ProductVideoSource =
  | {
      kind: "youtube";
      id: string;
      embedUrl: string;
      thumbUrl: string;
    }
  | {
      kind: "file";
      url: string;
    };

const YOUTUBE_ID =
  /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i;

export function parseProductVideoUrl(
  raw: string | null | undefined
): ProductVideoSource | null {
  const url = String(raw || "").trim();
  if (!url) return null;

  const ytMatch = url.match(YOUTUBE_ID);
  if (ytMatch) {
    const id = ytMatch[1];
    return {
      kind: "youtube",
      id,
      embedUrl: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`,
      thumbUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }

  if (/^https?:\/\//i.test(url) || url.startsWith("/")) {
    return { kind: "file", url };
  }

  return null;
}
