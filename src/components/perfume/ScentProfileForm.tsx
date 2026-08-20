"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePremiumStore } from "@/lib/premium-store";
import { FRAGRANCE_FAMILY_OPTIONS } from "@/lib/filter-options";
import { OCCASIONS, SEASONS } from "@/lib/scent-intelligence";
import { cn } from "@/lib/utils";

function ChipToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-sm border transition-colors",
        active ? "border-gold bg-highlight/20" : "border-wf-border hover:border-gold"
      )}
    >
      {children}
    </button>
  );
}

export function ScentProfileForm() {
  const profile = usePremiumStore((s) => s.profile);
  const updateProfile = usePremiumStore((s) => s.updateProfile);
  const resetProfile = usePremiumStore((s) => s.resetProfile);
  const [noteInput, setNoteInput] = useState("");
  const completeness = useMemo(() => {
    let n = 0;
    if (profile.families.length) n += 25;
    if (profile.occasions.length) n += 25;
    if (profile.seasons.length) n += 20;
    if (profile.intensity) n += 15;
    if (profile.budget) n += 15;
    return n;
  }, [profile]);

  function toggle(list: string[], value: string) {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-gold mb-1">
            Scent Profile
          </p>
          <h1 className="font-playfair text-3xl md:text-4xl">Your preference atlas</h1>
        </div>
        <p className="text-sm text-wf-gray">{completeness}% complete</p>
      </div>

      <section>
        <h2 className="font-playfair text-xl mb-3">Loved families</h2>
        <div className="flex flex-wrap gap-2">
          {FRAGRANCE_FAMILY_OPTIONS.map((f) => (
            <ChipToggle
              key={f.value}
              active={profile.families.includes(f.value)}
              onClick={() =>
                updateProfile({ families: toggle(profile.families, f.value) })
              }
            >
              {f.label}
            </ChipToggle>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-playfair text-xl mb-3">Occasions</h2>
        <div className="flex flex-wrap gap-2">
          {OCCASIONS.map((o) => (
            <ChipToggle
              key={o.id}
              active={profile.occasions.includes(o.id)}
              onClick={() =>
                updateProfile({ occasions: toggle(profile.occasions, o.id) })
              }
            >
              {o.label}
            </ChipToggle>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-playfair text-xl mb-3">Seasons</h2>
        <div className="flex flex-wrap gap-2">
          {SEASONS.map((s) => (
            <ChipToggle
              key={s.id}
              active={profile.seasons.includes(s.id)}
              onClick={() =>
                updateProfile({ seasons: toggle(profile.seasons, s.id) })
              }
            >
              {s.label}
            </ChipToggle>
          ))}
        </div>
      </section>

      <section className="grid sm:grid-cols-2 gap-6">
        <div>
          <h2 className="font-playfair text-xl mb-3">Intensity</h2>
          <div className="flex flex-wrap gap-2">
            {(["subtle", "moderate", "bold"] as const).map((v) => (
              <ChipToggle
                key={v}
                active={profile.intensity === v}
                onClick={() => updateProfile({ intensity: v })}
              >
                {v}
              </ChipToggle>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-playfair text-xl mb-3">Budget</h2>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["under100", "Under $100"],
                ["100to200", "$100-$200"],
                ["over200", "$200+"],
              ] as const
            ).map(([v, label]) => (
              <ChipToggle
                key={v}
                active={profile.budget === v}
                onClick={() => updateProfile({ budget: v })}
              >
                {label}
              </ChipToggle>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-playfair text-xl mb-3">Notes you love</h2>
        <div className="flex gap-2 mb-3">
          <input
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="e.g. bergamot"
            className="flex-1 border border-wf-border px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              const n = noteInput.trim();
              if (!n) return;
              updateProfile({
                notesLiked: profile.notesLiked.includes(n)
                  ? profile.notesLiked
                  : [...profile.notesLiked, n],
              });
              setNoteInput("");
            }}
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.notesLiked.map((n) => (
            <button
              key={n}
              type="button"
              className="px-2.5 py-1 text-xs border border-wf-border hover:border-red-400"
              onClick={() =>
                updateProfile({
                  notesLiked: profile.notesLiked.filter((x) => x !== n),
                })
              }
            >
              {n} ×
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/occasions" className="btn-gold">
          See occasion picks
        </Link>
        <Link href="/gift-finder" className="btn-outline">
          Gift finder
        </Link>
        <button type="button" onClick={resetProfile} className="text-sm text-wf-gray hover:text-espresso px-2">
          Reset profile
        </button>
      </div>
    </div>
  );
}
