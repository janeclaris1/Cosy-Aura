/** Realistic starting engagement for new catalog items. */
export function initialEngagementCounts(): { viewCount: number; likeCount: number } {
  return {
    viewCount: 120 + Math.floor(Math.random() * 280),
    likeCount: 8 + Math.floor(Math.random() * 52),
  };
}

export function formatEngagementCount(value: number): string {
  const n = Math.max(0, Math.floor(value));
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export const VIEW_SESSION_PREFIX = "cosyaura-viewed:";
const LIKED_STORAGE_KEY = "cosyaura-liked";

export function readLikedIds(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIKED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function hasUserLiked(fragranceId: string): boolean {
  return readLikedIds().includes(fragranceId);
}

export function setUserLiked(fragranceId: string, liked: boolean): void {
  if (typeof localStorage === "undefined") return;
  const ids = new Set(readLikedIds());
  if (liked) ids.add(fragranceId);
  else ids.delete(fragranceId);
  localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify([...ids]));
}

export function hasRecordedView(fragranceId: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(`${VIEW_SESSION_PREFIX}${fragranceId}`) === "1";
}

export function markViewRecorded(fragranceId: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(`${VIEW_SESSION_PREFIX}${fragranceId}`, "1");
}

export async function recordProductView(fragranceId: string): Promise<{
  viewCount: number;
  likeCount: number;
} | null> {
  if (hasRecordedView(fragranceId)) return null;

  try {
    const res = await fetch(`/api/fragrances/${encodeURIComponent(fragranceId)}/view`, {
      method: "POST",
    });
    if (!res.ok) return null;
    markViewRecorded(fragranceId);
    const data = await res.json();
    return {
      viewCount: Number(data.viewCount) || 0,
      likeCount: Number(data.likeCount) || 0,
    };
  } catch {
    return null;
  }
}

export async function syncProductLike(
  fragranceId: string,
  action: "add" | "remove"
): Promise<{ viewCount: number; likeCount: number } | null> {
  try {
    const res = await fetch(`/api/fragrances/${encodeURIComponent(fragranceId)}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      viewCount: Number(data.viewCount) || 0,
      likeCount: Number(data.likeCount) || 0,
    };
  } catch {
    return null;
  }
}
