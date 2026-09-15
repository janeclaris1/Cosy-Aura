export type PdpSponsoredAdConfig = {
  enabled: boolean;
  videoUrl: string | null;
  posterImage: string | null;
  title: string;
  href: string;
  rating: number | null;
  reviewCount: number | null;
  discountPercent: number | null;
  dealLabel: string | null;
  priceGhs: number | null;
  originalPriceGhs: number | null;
};

export const DEFAULT_PDP_SPONSORED_AD: PdpSponsoredAdConfig = {
  enabled: false,
  videoUrl: null,
  posterImage: null,
  title: "",
  href: "",
  rating: null,
  reviewCount: null,
  discountPercent: null,
  dealLabel: null,
  priceGhs: null,
  originalPriceGhs: null,
};

function readOptionalString(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s || null;
}

function readOptionalNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parsePdpSponsoredAd(raw: unknown): PdpSponsoredAdConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_PDP_SPONSORED_AD };
  }

  const input = raw as Record<string, unknown>;
  const rating = readOptionalNumber(input.rating);
  const discountPercent = readOptionalNumber(input.discountPercent);

  return {
    enabled: Boolean(input.enabled),
    videoUrl: readOptionalString(input.videoUrl),
    posterImage: readOptionalString(input.posterImage),
    title: readOptionalString(input.title) || "",
    href: readOptionalString(input.href) || "",
    rating: rating != null && rating >= 0 && rating <= 5 ? rating : null,
    reviewCount:
      readOptionalNumber(input.reviewCount) != null
        ? Math.max(0, Math.floor(Number(input.reviewCount)))
        : null,
    discountPercent:
      discountPercent != null && discountPercent >= 0 && discountPercent <= 100
        ? discountPercent
        : null,
    dealLabel: readOptionalString(input.dealLabel),
    priceGhs:
      readOptionalNumber(input.priceGhs) != null
        ? Math.max(0, Number(input.priceGhs))
        : null,
    originalPriceGhs:
      readOptionalNumber(input.originalPriceGhs) != null
        ? Math.max(0, Number(input.originalPriceGhs))
        : null,
  };
}

export function resolvePdpSponsoredAdPoster(config: PdpSponsoredAdConfig): string | null {
  if (config.posterImage) return config.posterImage;
  const video = String(config.videoUrl || "").trim();
  const ytMatch = video.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i
  );
  if (ytMatch) {
    return `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }
  return null;
}

export function isPdpSponsoredAdVisible(config: PdpSponsoredAdConfig): boolean {
  return (
    config.enabled &&
    Boolean(
      config.title &&
        config.href &&
        (config.videoUrl || config.posterImage || resolvePdpSponsoredAdPoster(config))
    )
  );
}

export type PdpSponsoredAdFormState = {
  enabled: boolean;
  videoUrl: string;
  posterImage: string;
  title: string;
  href: string;
  rating: string;
  reviewCount: string;
  discountPercent: string;
  dealLabel: string;
  priceGhs: string;
  originalPriceGhs: string;
};

export function pdpSponsoredAdToForm(raw?: unknown): PdpSponsoredAdFormState {
  const config = parsePdpSponsoredAd(raw);
  return {
    enabled: config.enabled,
    videoUrl: config.videoUrl || "",
    posterImage: config.posterImage || "",
    title: config.title || "",
    href: config.href || "",
    rating: config.rating != null ? String(config.rating) : "",
    reviewCount: config.reviewCount != null ? String(config.reviewCount) : "",
    discountPercent:
      config.discountPercent != null ? String(config.discountPercent) : "",
    dealLabel: config.dealLabel || "",
    priceGhs: config.priceGhs != null ? String(config.priceGhs) : "",
    originalPriceGhs:
      config.originalPriceGhs != null ? String(config.originalPriceGhs) : "",
  };
}

export function pdpSponsoredAdFromForm(
  form: PdpSponsoredAdFormState
): PdpSponsoredAdConfig {
  return parsePdpSponsoredAd({
    enabled: form.enabled,
    videoUrl: form.videoUrl,
    posterImage: form.posterImage,
    title: form.title,
    href: form.href,
    rating: form.rating,
    reviewCount: form.reviewCount,
    discountPercent: form.discountPercent,
    dealLabel: form.dealLabel,
    priceGhs: form.priceGhs,
    originalPriceGhs: form.originalPriceGhs,
  });
}

export function validatePdpSponsoredAd(config: PdpSponsoredAdConfig): string | null {
  if (!config.enabled) return null;
  if (!config.title.trim()) return "Title is required when the ad is enabled";
  if (!config.href.trim()) return "Link URL is required when the ad is enabled";
  if (!/^https?:\/\//i.test(config.href)) {
    return "Link URL must start with http:// or https://";
  }
  if (
    !config.videoUrl &&
    !config.posterImage &&
    !resolvePdpSponsoredAdPoster(config)
  ) {
    return "Add a video URL or poster image when the ad is enabled";
  }
  return null;
}
