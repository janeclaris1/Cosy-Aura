"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScentTalk } from "@/lib/scent-talks";
import { JournalMagazineCard } from "@/components/journal/JournalMagazineCard";

export function ScentTalkCard({
  talk,
  onPlay,
  showTitle = true,
  compact = false,
  magazine = false,
}: {
  talk: ScentTalk;
  onPlay: (talk: ScentTalk) => void;
  showTitle?: boolean;
  compact?: boolean;
  magazine?: boolean;
}) {
  if (magazine) {
    return (
      <JournalMagazineCard
        onClick={() => onPlay(talk)}
        ariaLabel={`Play ${talk.title}`}
        image={talk.poster}
        title={talk.title}
        cta="Watch now"
      />
    );
  }
  return (
    <article>
      <button
        type="button"
        onClick={() => onPlay(talk)}
        className="group relative block w-full aspect-[16/9] overflow-hidden rounded-sm text-left bg-espresso"
        aria-label={`Play ${talk.title}`}
      >
        <Image
          src={talk.poster}
          alt=""
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          sizes={
            compact
              ? "(max-width: 768px) 50vw, 25vw"
              : "(max-width: 768px) 100vw, 33vw"
          }
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/15" />

        <span className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              "rounded-full border-2 border-white/90 bg-[#0b1c3d]/80 flex items-center justify-center group-hover:bg-[#0b1c3d] transition-colors",
              compact ? "w-9 h-9 md:w-10 md:h-10" : "w-14 h-14"
            )}
          >
            <Play
              className={cn(
                "text-white fill-white ml-0.5",
                compact ? "w-3.5 h-3.5" : "w-5 h-5"
              )}
            />
          </span>
        </span>

        <span
          className={cn(
            "absolute inset-x-0 text-center px-2",
            compact ? "bottom-6 md:bottom-7" : "bottom-10 px-4"
          )}
        >
          <span
            className={cn(
              "block text-white font-semibold tracking-[0.18em] uppercase",
              compact ? "text-[10px] sm:text-[11px] md:text-xs" : "text-lg sm:text-xl"
            )}
          >
            Scent Talk
          </span>
          <span
            className={cn(
              "block text-white/90 mt-0.5",
              compact ? "text-[10px] sm:text-[11px] leading-tight" : "text-sm"
            )}
          >
            with {talk.guest}
          </span>
        </span>

        <span
          className={cn(
            "absolute rounded bg-[#0b1c3d]/90 text-white tabular-nums",
            compact
              ? "bottom-1.5 right-1.5 text-[9px] px-1 py-0.5"
              : "bottom-2.5 right-2.5 text-[11px] px-1.5 py-0.5"
          )}
        >
          {talk.duration}
        </span>
      </button>

      {showTitle && (
        <h3
          className={cn(
            "text-espresso leading-snug",
            compact ? "mt-2 text-[11px] md:text-xs line-clamp-2" : "mt-3 text-sm sm:text-[15px]"
          )}
        >
          {talk.title}
        </h3>
      )}
    </article>
  );
}
