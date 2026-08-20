export type GoogleReviewCard = {
  name: string;
  initial: string;
  color: string;
  photoUrl?: string;
  when: string;
  rating: number;
  text: string;
};

export type GoogleReviewsPayload = {
  reviews: GoogleReviewCard[];
  rating?: number;
  total?: number;
  mapsUrl?: string;
};

const AVATAR_COLORS = [
  "#e57373",
  "#7986cb",
  "#4db6ac",
  "#ffb74d",
  "#9575cd",
  "#64b5f6",
];

function colorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initialFor(name: string) {
  const ch = name.trim().charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

function normalizePlaceId(raw: string) {
  return raw.replace(/^places\//, "").trim();
}

async function fetchViaNewPlaces(
  placeId: string,
  apiKey: string
): Promise<GoogleReviewsPayload | null> {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "rating,userRatingCount,googleMapsUri,reviews.rating,reviews.text,reviews.relativePublishTimeDescription,reviews.authorAttribution",
      },
      next: { revalidate: 3600 },
    }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
    reviews?: {
      rating?: number;
      relativePublishTimeDescription?: string;
      text?: { text?: string };
      authorAttribution?: { displayName?: string; photoUri?: string };
    }[];
  };
  const reviews = (data.reviews || [])
    .map((r) => {
      const name = r.authorAttribution?.displayName?.trim() || "Google user";
      const text = r.text?.text?.trim() || "";
      if (!text) return null;
      return {
        name,
        initial: initialFor(name),
        color: colorForName(name),
        ...(r.authorAttribution?.photoUri
          ? { photoUrl: r.authorAttribution.photoUri }
          : {}),
        when: r.relativePublishTimeDescription || "",
        rating: Math.round(r.rating || 5),
        text,
      } satisfies GoogleReviewCard;
    })
    .filter((r): r is GoogleReviewCard => !!r);

  return {
    reviews,
    rating: data.rating,
    total: data.userRatingCount,
    mapsUrl: data.googleMapsUri,
  };
}

async function fetchViaLegacyPlaces(
  placeId: string,
  apiKey: string
): Promise<GoogleReviewsPayload | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "name,rating,user_ratings_total,reviews,url");
  url.searchParams.set("reviews_sort", "newest");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    status?: string;
    result?: {
      rating?: number;
      user_ratings_total?: number;
      url?: string;
      reviews?: {
        author_name?: string;
        profile_photo_url?: string;
        rating?: number;
        relative_time_description?: string;
        text?: string;
      }[];
    };
  };
  if (data.status && data.status !== "OK") {
    console.error("Google Places details:", data.status);
    return null;
  }
  const result = data.result;
  if (!result) return null;

  const reviews = (result.reviews || [])
    .map((r) => {
      const name = r.author_name?.trim() || "Google user";
      const text = r.text?.trim() || "";
      if (!text) return null;
      return {
        name,
        initial: initialFor(name),
        color: colorForName(name),
        ...(r.profile_photo_url ? { photoUrl: r.profile_photo_url } : {}),
        when: r.relative_time_description || "",
        rating: Math.round(r.rating || 5),
        text,
      } satisfies GoogleReviewCard;
    })
    .filter((r): r is GoogleReviewCard => !!r);

  return {
    reviews,
    rating: result.rating,
    total: result.user_ratings_total,
    mapsUrl: result.url,
  };
}

async function loadGoogleReviews(): Promise<GoogleReviewsPayload> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const placeId = normalizePlaceId(process.env.GOOGLE_PLACE_ID || "");
  if (!apiKey || !placeId) {
    return { reviews: [] };
  }

  try {
    const nextApi = await fetchViaNewPlaces(placeId, apiKey);
    if (nextApi?.reviews.length) return nextApi;
    const legacy = await fetchViaLegacyPlaces(placeId, apiKey);
    if (legacy?.reviews.length) return legacy;
    return nextApi || legacy || { reviews: [] };
  } catch (err) {
    console.error("Google reviews fetch failed", err);
    return { reviews: [] };
  }
}

export async function getGoogleReviews() {
  return loadGoogleReviews();
}
