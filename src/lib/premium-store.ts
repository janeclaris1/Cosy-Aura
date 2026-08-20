import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Local notes about a fragrance (Scent Memory) */
export type ScentMemoryEntry = {
  fragranceId: string;
  slug: string;
  brand: string;
  model: string;
  image?: string;
  notes: string;
  mood?: string;
  rating?: number;
  updatedAt: string;
};

/** Wear log (Scent Journal) */
export type JournalEntry = {
  id: string;
  fragranceId: string;
  slug: string;
  brand: string;
  model: string;
  image?: string;
  wornAt: string;
  occasion?: string;
  weather?: string;
  thoughts?: string;
};

export type CompareItem = {
  id: string;
  slug: string;
  brand: string;
  model: string;
  price: number;
  image: string;
  fragranceFamily: string;
  concentration: string;
  longevity: string | null;
  sillage: string;
  bottleSize: number;
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
};

export type ScentProfilePrefs = {
  families: string[];
  occasions: string[];
  seasons: string[];
  intensity: "subtle" | "moderate" | "bold" | "";
  budget: "under100" | "100to200" | "over200" | "";
  notesLiked: string[];
  notesDisliked: string[];
  updatedAt?: string;
};

interface PremiumStore {
  memories: Record<string, ScentMemoryEntry>;
  journal: JournalEntry[];
  compare: CompareItem[];
  profile: ScentProfilePrefs;

  upsertMemory: (entry: Omit<ScentMemoryEntry, "updatedAt">) => void;
  removeMemory: (fragranceId: string) => void;

  addJournalEntry: (entry: Omit<JournalEntry, "id">) => void;
  removeJournalEntry: (id: string) => void;

  toggleCompare: (item: CompareItem) => void;
  removeCompare: (id: string) => void;
  clearCompare: () => void;
  isComparing: (id: string) => boolean;

  updateProfile: (patch: Partial<ScentProfilePrefs>) => void;
  resetProfile: () => void;
}

const emptyProfile: ScentProfilePrefs = {
  families: [],
  occasions: [],
  seasons: [],
  intensity: "",
  budget: "",
  notesLiked: [],
  notesDisliked: [],
};

export const usePremiumStore = create<PremiumStore>()(
  persist(
    (set, get) => ({
      memories: {},
      journal: [],
      compare: [],
      profile: emptyProfile,

      upsertMemory: (entry) => {
        set({
          memories: {
            ...get().memories,
            [entry.fragranceId]: {
              ...entry,
              updatedAt: new Date().toISOString(),
            },
          },
        });
      },

      removeMemory: (fragranceId) => {
        const next = { ...get().memories };
        delete next[fragranceId];
        set({ memories: next });
      },

      addJournalEntry: (entry) => {
        const id = `j-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        set({ journal: [{ ...entry, id }, ...get().journal].slice(0, 200) });
      },

      removeJournalEntry: (id) => {
        set({ journal: get().journal.filter((e) => e.id !== id) });
      },

      toggleCompare: (item) => {
        const exists = get().compare.some((c) => c.id === item.id);
        if (exists) {
          set({ compare: get().compare.filter((c) => c.id !== item.id) });
          return;
        }
        const next = [...get().compare, item].slice(-3);
        set({ compare: next });
      },

      removeCompare: (id) => {
        set({ compare: get().compare.filter((c) => c.id !== id) });
      },

      clearCompare: () => set({ compare: [] }),

      isComparing: (id) => get().compare.some((c) => c.id === id),

      updateProfile: (patch) => {
        set({
          profile: {
            ...get().profile,
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      resetProfile: () => set({ profile: emptyProfile }),
    }),
    { name: "cosyaura-premium" }
  )
);
