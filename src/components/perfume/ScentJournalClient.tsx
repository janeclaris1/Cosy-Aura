"use client";

import Link from "next/link";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { usePremiumStore } from "@/lib/premium-store";

export function ScentJournalClient() {
  const journal = usePremiumStore((s) => s.journal);
  const memories = usePremiumStore((s) => s.memories);
  const removeJournalEntry = usePremiumStore((s) => s.removeJournalEntry);
  const removeMemory = usePremiumStore((s) => s.removeMemory);
  const memoryList = Object.values(memories).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );

  return (
    <div className="grid lg:grid-cols-2 gap-10">
      <section>
        <h2 className="font-playfair text-2xl mb-4">Worn recently</h2>
        {journal.length === 0 ? (
          <p className="text-sm text-wf-gray">
            No wears logged yet. Open a product page and tap “Log as worn today”.
          </p>
        ) : (
          <ul className="space-y-4">
            {journal.map((e) => (
              <li
                key={e.id}
                className="flex gap-3 border border-wf-border p-3 bg-white"
              >
                <div className="relative w-16 h-16 shrink-0 bg-wf-light">
                  <Image
                    src={e.image || "/images/placeholders/fragrance.svg"}
                    alt={e.model}
                    fill
                    className="object-contain p-1"
                    sizes="64px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/fragrances/${e.slug}`}
                    className="font-medium hover:text-gold"
                  >
                    {e.brand} {e.model}
                  </Link>
                  <p className="text-xs text-wf-gray">
                    {new Date(e.wornAt).toLocaleString()}
                    {e.occasion ? ` · ${e.occasion}` : ""}
                  </p>
                  {e.thoughts && (
                    <p className="text-sm text-mocha mt-1 line-clamp-2">{e.thoughts}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeJournalEntry(e.id)}
                  className="text-wf-gray hover:text-red-700"
                  aria-label="Remove entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-playfair text-2xl mb-4">Saved memories</h2>
        {memoryList.length === 0 ? (
          <p className="text-sm text-wf-gray">
            Your private scent notes will appear here.
          </p>
        ) : (
          <ul className="space-y-4">
            {memoryList.map((m) => (
              <li
                key={m.fragranceId}
                className="border border-wf-border p-4 bg-white"
              >
                <div className="flex justify-between gap-3 mb-2">
                  <Link
                    href={`/fragrances/${m.slug}`}
                    className="font-medium hover:text-gold"
                  >
                    {m.brand} {m.model}
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeMemory(m.fragranceId)}
                    className="text-wf-gray hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {m.rating ? (
                  <p className="text-gold text-sm mb-1">{"★".repeat(m.rating)}</p>
                ) : null}
                {m.mood && (
                  <p className="text-xs uppercase tracking-wider text-wf-gray mb-1">
                    {m.mood}
                  </p>
                )}
                <p className="text-sm text-mocha whitespace-pre-wrap">{m.notes}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
