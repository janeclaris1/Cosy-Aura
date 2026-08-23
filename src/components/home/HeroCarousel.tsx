"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/locale-store";

const SLIDES = [
  {
    image: "/images/hero/legacy.jpg",
    object: "object-[center_20%]",
    overlay: "bg-gradient-to-r from-black/70 via-black/35 to-transparent",
    eyebrowKey: "home.hero1.eyebrow",
    titleKey: "home.hero1.title",
    subtitleKey: "home.hero1.subtitle",
    ctaKey: "home.hero1.cta",
    href: "/fragrances",
  },
  {
    image: "/images/hero/rose.jpg",
    object: "object-center",
    overlay: "bg-gradient-to-r from-black/80 via-black/45 to-black/10",
    eyebrowKey: "home.hero2.eyebrow",
    titleKey: "home.hero2.title",
    subtitleKey: "home.hero2.subtitle",
    ctaKey: "home.hero2.cta",
    href: "/fragrances?fragranceFamily=FLORAL",
  },
  {
    image: "/images/hero/zino.jpg",
    object: "object-center",
    overlay: "bg-gradient-to-r from-black/75 via-black/40 to-transparent",
    eyebrowKey: "home.hero3.eyebrow",
    titleKey: "home.hero3.title",
    subtitleKey: "home.hero3.subtitle",
    ctaKey: "home.hero3.cta",
    href: "/fragrances",
  },
  {
    image: "/images/hero/black-orchid.jpg",
    object: "object-[center_15%]",
    overlay: "bg-gradient-to-r from-black/80 via-[#2a0a12]/50 to-transparent",
    eyebrowKey: "home.hero4.eyebrow",
    titleKey: "home.hero4.title",
    subtitleKey: "home.hero4.subtitle",
    ctaKey: "home.hero4.cta",
    href: "/fragrances?fragranceFamily=ORIENTAL",
  },
] as const;

/** YouTube hero mini player (default). */
const HERO_YOUTUBE_ID =
  process.env.NEXT_PUBLIC_HERO_VIDEO_YOUTUBE || "s0UL1nLCuF0";
const HERO_YOUTUBE_START = Number(
  process.env.NEXT_PUBLIC_HERO_VIDEO_START || "45"
);
/** Optional local mp4 — only used when NEXT_PUBLIC_HERO_VIDEO_SRC is set. */
const HERO_VIDEO_SRC = process.env.NEXT_PUBLIC_HERO_VIDEO_SRC || "";

function youtubeEmbedSrc() {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    loop: "1",
    playlist: HERO_YOUTUBE_ID,
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    start: String(Number.isFinite(HERO_YOUTUBE_START) ? HERO_YOUTUBE_START : 45),
  });
  return `https://www.youtube.com/embed/${HERO_YOUTUBE_ID}?${params.toString()}`;
}

function HeroMiniPlayer() {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [useYoutube, setUseYoutube] = useState(!HERO_VIDEO_SRC);
  const [muted, setMuted] = useState(true);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || useYoutube) return;

    const tryPlay = () => {
      el.muted = true;
      const play = el.play();
      if (play && typeof play.catch === "function") {
        play.catch(() => setUseYoutube(true));
      }
    };

    tryPlay();
  }, [useYoutube]);

  function toggleMute() {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
    if (!el.muted) {
      void el.play().catch(() => undefined);
    }
  }

  function closeVideo() {
    videoRef.current?.pause();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className={cn(
        "absolute z-[5] overflow-hidden rounded-md border border-white/25 bg-black shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
        "right-4 bottom-14 sm:right-6 sm:bottom-16 md:right-8 md:bottom-8",
        useYoutube
          ? "w-[58vw] max-w-[360px] sm:w-[310px] md:w-[400px] aspect-video"
          : "w-[48vw] max-w-[280px] sm:w-[250px] md:w-[300px] aspect-[9/16] md:aspect-[3/4]"
      )}
    >
      <button
        type="button"
        onClick={closeVideo}
        className="absolute top-1.5 right-1.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors"
        aria-label={t("home.closeVideo")}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
      {useYoutube ? (
        <iframe
          title="Cosy Aura hero video"
          src={youtubeEmbedSrc()}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <>
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/images/hero/legacy.jpg"
            onError={() => setUseYoutube(true)}
          >
            <source src={HERO_VIDEO_SRC} type="video/mp4" />
          </video>
          <button
            type="button"
            onClick={toggleMute}
            className="absolute bottom-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm hover:bg-black/75 transition-colors"
            aria-label={muted ? "Unmute video" : "Mute video"}
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        </>
      )}
    </div>
  );
}

export function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const t = useT();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative h-[70vw] max-h-[640px] min-h-[380px] md:h-[560px] md:max-h-none overflow-hidden bg-espresso">
      {SLIDES.map((s, i) => (
        <div
          key={s.image}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-out",
            i === current ? "opacity-100 z-[1]" : "opacity-0 z-0 pointer-events-none"
          )}
        >
          <Image
            src={s.image}
            alt=""
            fill
            className={cn("object-cover", s.object)}
            priority={i === 0}
            sizes="100vw"
          />
          <div className={cn("absolute inset-0", s.overlay)} />
          <div className="relative h-full max-w-[1500px] mx-auto px-5 md:px-8 flex flex-col justify-center">
            <p className="text-[11px] md:text-xs uppercase tracking-[0.22em] text-white/80 mb-3">
              {t(s.eyebrowKey)}
            </p>
            <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] text-white leading-[1.12] whitespace-pre-line max-w-xl mb-4">
              {t(s.titleKey)}
            </h1>
            <p className="text-white/85 text-sm md:text-base max-w-md mb-7 leading-relaxed">
              {t(s.subtitleKey)}
            </p>
            <div>
              <Link
                href={s.href}
                className="inline-block bg-ivory text-espresso text-[12px] uppercase tracking-[0.16em] px-7 py-3 hover:bg-white transition-colors"
              >
                {t(s.ctaKey)}
              </Link>
            </div>
          </div>
        </div>
      ))}

      <HeroMiniPlayer />

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex gap-1">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="inline-flex items-center justify-center min-h-11 min-w-11"
          >
            <span
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === current ? "w-8 bg-white" : "w-1.5 bg-white/45"
              )}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
