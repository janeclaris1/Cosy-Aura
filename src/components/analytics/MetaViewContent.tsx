"use client";

import { useEffect, useRef } from "react";
import { trackMetaViewContent } from "@/lib/meta-pixel";

/** Fires Meta ViewContent once per product page visit. */
export function MetaViewContent({
  contentId,
  contentName,
  value,
  currency,
}: {
  contentId: string;
  contentName: string;
  value: number;
  currency: string;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current || !contentId) return;
    sent.current = true;
    trackMetaViewContent({ contentId, contentName, value, currency });
  }, [contentId, contentName, value, currency]);

  return null;
}
