import { readConsent } from "@/lib/cookie-consent";

export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID || "";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export type MetaContent = {
  id: string;
  quantity: number;
  item_price?: number;
};

function hasMarketingConsent() {
  const consent = readConsent();
  // Accept-all sets marketing; also allow analytics-only sites that accepted everything as "accepted"
  if (!consent) return false;
  if (consent.prefs.marketing) return true;
  return consent.choice === "accepted";
}

export function isMetaPixelReady() {
  return Boolean(META_PIXEL_ID && typeof window !== "undefined" && window.fbq);
}

/** Fire a standard Meta Pixel event when marketing cookies are allowed. */
export function trackMeta(
  event: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string }
) {
  if (!META_PIXEL_ID || typeof window === "undefined") return;
  if (!hasMarketingConsent()) return;
  if (!window.fbq) return;

  if (options?.eventID) {
    window.fbq("track", event, params || {}, { eventID: options.eventID });
  } else {
    window.fbq("track", event, params || {});
  }
}

export function trackMetaPageView() {
  trackMeta("PageView");
}

export function trackMetaViewContent(input: {
  contentId: string;
  contentName: string;
  value: number;
  currency: string;
}) {
  trackMeta("ViewContent", {
    content_ids: [input.contentId],
    content_name: input.contentName,
    content_type: "product",
    value: input.value,
    currency: input.currency,
  });
}

export function trackMetaAddToCart(input: {
  contentId: string;
  contentName: string;
  value: number;
  currency: string;
  quantity?: number;
}) {
  trackMeta("AddToCart", {
    content_ids: [input.contentId],
    content_name: input.contentName,
    content_type: "product",
    value: input.value,
    currency: input.currency,
    contents: [
      {
        id: input.contentId,
        quantity: input.quantity ?? 1,
        item_price: input.value,
      },
    ],
  });
}

export function trackMetaInitiateCheckout(input: {
  value: number;
  currency: string;
  contents: MetaContent[];
  numItems: number;
}) {
  trackMeta("InitiateCheckout", {
    value: input.value,
    currency: input.currency,
    contents: input.contents,
    content_ids: input.contents.map((c) => c.id),
    num_items: input.numItems,
    content_type: "product",
  });
}

export function trackMetaPurchase(input: {
  value: number;
  currency: string;
  contents: MetaContent[];
  eventID?: string;
}) {
  trackMeta(
    "Purchase",
    {
      value: input.value,
      currency: input.currency,
      contents: input.contents,
      content_ids: input.contents.map((c) => c.id),
      content_type: "product",
      num_items: input.contents.reduce((sum, c) => sum + c.quantity, 0),
    },
    input.eventID ? { eventID: input.eventID } : undefined
  );
}
