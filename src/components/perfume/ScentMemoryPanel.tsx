"use client";

import { useEffect, useState } from "react";
import { BookOpen, Trash2 } from "lucide-react";
import { usePremiumStore } from "@/lib/premium-store";
import { cn } from "@/lib/utils";

interface ScentMemoryPanelProps {
  fragranceId: string;
  slug: string;
  brand: string;
  model: string;
  image?: string;
  className?: string;
}

export function ScentMemoryPanel({
  fragranceId,
  slug,
  brand,
  model,
  image,
  className,
}: ScentMemoryPanelProps) {
  const memory = usePremiumStore((s) => s.memories[fragranceId]);
  const upsertMemory = usePremiumStore((s) => s.upsertMemory);
  const removeMemory = usePremiumStore((s) => s.removeMemory);
  const addJournalEntry = usePremiumStore((s) => s.addJournalEntry);

  const [notes, setNotes] = useState("");
  const [mood, setMood] = useState("");
  const [rating, setRating] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setNotes(memory?.notes || "");
    setMood(memory?.mood || "");
    setRating(memory?.rating || 0);
  }, [memory]);

  function save() {
    upsertMemory({ fragranceId, slug, brand, model, image, notes, mood, rating });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  function logWear() {
    addJournalEntry({
      fragranceId,
      slug,
      brand,
      model,
      image,
      wornAt: new Date().toISOString(),
      occasion: mood || undefined,
      thoughts: notes || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  return (
    <div className={cn("border border-wf-border bg-ivory/40 p-4 md:p-5", className)}>
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-gold" />
        <h3 className="font-playfair text-xl">Scent Memory</h3>
      </div>
      <p className="text-sm text-wf-gray mb-4">
        Save private notes about how this perfume feels on you - mood, memories, ratings.
      </p>

      <label className="block text-xs uppercase tracking-wider text-wf-gray mb-1">
        Your notes
      </label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        placeholder="Smells like rain on warm stone… lasting soft amber by evening."
        className="w-full border border-wf-border bg-white px-3 py-2 text-sm mb-3 focus:outline-none focus:border-gold"
      />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-wf-gray mb-1">
            Mood
          </label>
          <input
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="Confident, calm…"
            className="w-full border border-wf-border bg-white px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-wf-gray mb-1">
            Your rating
          </label>
          <div className="flex gap-1 pt-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={cn(
                  "text-lg leading-none transition-colors",
                  rating >= n ? "text-gold" : "text-wf-border"
                )}
                aria-label={`${n} stars`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} className="btn-gold">
          {saved ? "Saved" : "Save memory"}
        </button>
        <button type="button" onClick={logWear} className="btn-outline">
          Log as worn today
        </button>
        {memory && (
          <button
            type="button"
            onClick={() => removeMemory(fragranceId)}
            className="inline-flex items-center gap-1 text-sm text-wf-gray hover:text-red-700 px-2"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
