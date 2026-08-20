import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PEXELS_API = "https://api.pexels.com/v1";

export type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  alt: string | null;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
};

type SearchResponse = {
  photos: PexelsPhoto[];
  total_results: number;
  page: number;
  per_page: number;
};

function getApiKey(): string {
  const key = process.env.PEXELS_API_KEY?.trim();
  if (!key) {
    throw new Error("PEXELS_API_KEY is not set in .env");
  }
  return key;
}

export async function searchPexelsPhotos(
  query: string,
  options: { perPage?: number; page?: number; orientation?: "landscape" | "portrait" | "square" } = {}
): Promise<PexelsPhoto[]> {
  const params = new URLSearchParams({
    query,
    per_page: String(options.perPage ?? 8),
    page: String(options.page ?? 1),
  });
  if (options.orientation) params.set("orientation", options.orientation);

  const res = await fetch(`${PEXELS_API}/search?${params}`, {
    headers: { Authorization: getApiKey() },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pexels search failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as SearchResponse;
  return data.photos || [];
}

export async function downloadPexelsPhoto(
  photo: PexelsPhoto,
  outputDir: string,
  filename: string
): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const imageUrl = photo.src.large2x || photo.src.large || photo.src.original;
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Failed to download Pexels photo ${photo.id}: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const outputPath = path.join(outputDir, filename);
  await writeFile(outputPath, buffer);

  const relative = outputPath.split(`${path.sep}public${path.sep}`)[1];
  return relative ? `/${relative.replace(/\\/g, "/")}` : outputPath;
}
