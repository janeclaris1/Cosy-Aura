"use client";

import { useEffect, useMemo, useRef } from "react";
import { Info, Star } from "lucide-react";
import {
  isPdpSponsoredAdVisible,
  resolvePdpSponsoredAdPoster,
  type PdpSponsoredAdConfig,
} from "@/lib/pdp-sponsored-ad";
import { parseProductVideoUrl, youtubeSponsoredEmbedUrl } from "@/lib/product-video";
import { useLocaleStore } from "@/lib/locale-store";
import { formatPrice, cn } from "@/lib/utils";

function StarRating({ rating }: { rating: number }) {
  const stars = useMemo(() => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.25 && rating - full < 0.75;
    const empty = 5 - full - (half ? 1 : 0);
    return { full, half, empty };
  }, [rating]);

  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: stars.full }).map((_, i) => (
        <Star key={`f-${i}`} className="h-3.5 w-3.5 fill-[#ffa41c] text-[#ffa41c]" />
      ))}
      {stars.half ? (
        <span className="relative inline-flex h-3.5 w-3.5">
          <Star className="absolute inset-0 h-3.5 w-3.5 text-[#ffa41c]/35" />
          <Star
            className="absolute inset-0 h-3.5 w-3.5 fill-[#ffa41c] text-[#ffa41c]"
            style={{ clipPath: "inset(0 50% 0 0)" }}
          />
        </span>
      ) : null}
      {Array.from({ length: stars.empty }).map((_, i) => (
        <Star key={`e-${i}`} className="h-3.5 w-3.5 text-[#ffa41c]/35" />
      ))}
    </div>
  );
}

/** Fills wide ad frames and crops baked-in letterboxing from social downloads. */
const coverMediaClass =
  "pointer-events-none absolute left-1/2 top-1/2 block min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 object-cover object-center";

function SponsoredAdMedia({
  config,
  title,
  posterImage,
}: {
  config: PdpSponsoredAdConfig;
  title: string;
  posterImage: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const video = parseProductVideoUrl(config.videoUrl);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || video?.kind !== "file") return;

    const fitCoverCrop = () => {
      const target = videoRef.current;
      if (!target?.videoWidth || !target.videoHeight) return;
      const parent = target.parentElement;
      if (!parent) return;

      const containerAspect = parent.clientWidth / parent.clientHeight;
      const videoAspect = target.videoWidth / target.videoHeight;
      // Zoom in when the file is taller/narrower than the wide ad frame (common on Pinterest downloads).
      const computed =
        videoAspect < containerAspect
          ? (containerAspect / videoAspect) * 0.92
          : 1.25;
      const extraScale = Math.min(1.85, Math.max(1.4, computed));

      target.style.transform = `translate(-50%, -50%) scale(${extraScale})`;
    };

    videoEl.addEventListener("loadedmetadata", fitCoverCrop);
    fitCoverCrop();
    void videoEl.play().catch(() => undefined);

    return () => videoEl.removeEventListener("loadedmetadata", fitCoverCrop);
  }, [video]);

  if (video?.kind === "youtube") {
    return (
      <iframe
        src={youtubeSponsoredEmbedUrl(video.id)}
        title={title}
        className="pointer-events-none absolute left-1/2 top-1/2 h-[145%] w-[145%] max-w-none -translate-x-1/2 -translate-y-1/2 border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        tabIndex={-1}
        aria-hidden
      />
    );
  }

  if (video?.kind === "file") {
    return (
      <video
        ref={videoRef}
        src={video.url}
        autoPlay
        muted
        loop
        playsInline
        disablePictureInPicture
        disableRemotePlayback
        className={coverMediaClass}
        title={title}
        aria-hidden
      />
    );
  }

  if (posterImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- admin-entered ad URLs may be from any host
      <img src={posterImage} alt="" className={coverMediaClass} />
    );
  }

  return <span className="absolute inset-0 bg-espresso/10" aria-hidden />;
}

export function PdpSponsoredAd({
  config,
  className,
}: {
  config: PdpSponsoredAdConfig;
  className?: string;
}) {
  const currency = useLocaleStore((s) => s.currency);
  const rates = useLocaleStore((s) => s.rates);

  if (!isPdpSponsoredAdVisible(config)) return null;

  const posterImage = resolvePdpSponsoredAdPoster(config);

  const displayPrice =
    config.priceGhs != null
      ? config.priceGhs * (rates[currency] ?? 1)
      : null;
  const displayOriginal =
    config.originalPriceGhs != null
      ? config.originalPriceGhs * (rates[currency] ?? 1)
      : null;

  return (
    <aside
      className={cn("mt-6", className)}
      aria-label="Sponsored"
      data-sponsored-ad
    >
      <div className="flex flex-col overflow-hidden border border-wf-border bg-white sm:flex-row">
        <div className="relative aspect-[5/2] w-full shrink-0 overflow-hidden bg-white sm:w-[62%]">
          <SponsoredAdMedia
            config={config}
            title={config.title}
            posterImage={posterImage}
          />
        </div>

        <a
          href={config.href}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="group flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-4 py-3 transition-shadow hover:bg-ivory/40 sm:px-5"
        >
          <p className="line-clamp-2 text-sm font-medium leading-snug text-espresso group-hover:underline">
            {config.title}
          </p>

          {config.rating != null ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-mocha">
              <span className="font-medium text-espresso">
                {config.rating.toFixed(1)}
              </span>
              <StarRating rating={config.rating} />
              {config.reviewCount != null ? (
                <span>{config.reviewCount.toLocaleString()}</span>
              ) : null}
            </div>
          ) : null}

          {config.discountPercent != null || config.dealLabel ? (
            <div className="flex flex-wrap items-center gap-2">
              {config.discountPercent != null ? (
                <span className="bg-[#cc0c39] px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                  {config.discountPercent}% off
                </span>
              ) : null}
              {config.dealLabel ? (
                <span className="text-xs font-medium text-[#cc0c39]">
                  {config.dealLabel}
                </span>
              ) : null}
            </div>
          ) : null}

          {displayPrice != null ? (
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-playfair text-2xl leading-none text-espresso">
                {formatPrice(displayPrice, currency)}
              </span>
              {displayOriginal != null && displayOriginal > displayPrice ? (
                <span className="text-sm text-mocha line-through">
                  {formatPrice(displayOriginal, currency)}
                </span>
              ) : null}
            </div>
          ) : null}
        </a>
      </div>

      <p className="mt-1.5 flex items-center justify-end gap-1 text-[11px] text-wf-gray">
        <span>Sponsored</span>
        <Info className="h-3 w-3" aria-hidden />
      </p>
    </aside>
  );
}
