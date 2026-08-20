"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { ScentTalk } from "@/lib/scent-talks";

export function ScentTalkPlayer({
  talk,
  onClose,
}: {
  talk: ScentTalk | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!talk) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [talk, onClose]);

  if (!talk) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl aspect-video bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/90 hover:text-white"
          aria-label="Close video"
        >
          <X className="w-6 h-6" />
        </button>
        <iframe
          title={talk.title}
          src={`https://www.youtube.com/embed/${talk.youtubeId}?autoplay=1`}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
