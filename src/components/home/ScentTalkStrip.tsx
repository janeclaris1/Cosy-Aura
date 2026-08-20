"use client";

import { useState } from "react";
import { ScentTalkCard } from "@/components/journal/ScentTalkCard";
import { ScentTalkPlayer } from "@/components/journal/ScentTalkPlayer";
import { FEATURED_SCENT_TALKS, type ScentTalk } from "@/lib/scent-talks";

export function ScentTalkStrip() {
  const [active, setActive] = useState<ScentTalk | null>(null);

  return (
    <div className="py-8 md:py-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
        {FEATURED_SCENT_TALKS.map((talk) => (
          <ScentTalkCard key={talk.id} talk={talk} onPlay={setActive} />
        ))}
      </div>
      <ScentTalkPlayer talk={active} onClose={() => setActive(null)} />
    </div>
  );
}
