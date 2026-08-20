import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BottleSize } from "@/lib/bottle-sizes";
import { trackMetaAddToCart } from "@/lib/meta-pixel";

export interface CartItem {
  fragranceId: string;
  slug: string;
  brand: string;
  model: string;
  price: number;
  image: string;
  quantity: number;
  /** Retail bottle size in ml (30 / 50 / 100). Omitted for samples/subscriptions. */
  bottleSize?: BottleSize | number;
}

function sameCartLine(
  a: Pick<CartItem, "fragranceId" | "bottleSize">,
  b: Pick<CartItem, "fragranceId" | "bottleSize">
) {
  return a.fragranceId === b.fragranceId && (a.bottleSize ?? null) === (b.bottleSize ?? null);
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  currency: string;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (fragranceId: string, bottleSize?: number) => void;
  updateQuantity: (fragranceId: string, quantity: number, bottleSize?: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  setCurrency: (currency: string) => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      currency: "GHS",

      addItem: (item) => {
        const items = get().items;
        const existing = items.find((i) => sameCartLine(i, item));
        if (existing) {
          set({
            items: items.map((i) =>
              sameCartLine(i, item) ? { ...i, quantity: i.quantity + 1 } : i
            ),
            isOpen: true,
          });
        } else {
          set({ items: [...items, { ...item, quantity: 1 }], isOpen: true });
        }
        trackMetaAddToCart({
          contentId: item.fragranceId,
          contentName: `${item.brand} ${item.model}`,
          value: item.price,
          currency: get().currency || "GHS",
          quantity: 1,
        });
      },

      removeItem: (fragranceId, bottleSize) => {
        set({
          items: get().items.filter(
            (i) => !sameCartLine(i, { fragranceId, bottleSize })
          ),
        });
      },

      updateQuantity: (fragranceId, quantity, bottleSize) => {
        if (quantity <= 0) {
          get().removeItem(fragranceId, bottleSize);
          return;
        }
        set({
          items: get().items.map((i) =>
            sameCartLine(i, { fragranceId, bottleSize })
              ? { ...i, quantity }
              : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set({ isOpen: !get().isOpen }),
      setCurrency: (currency) => set({ currency }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: "cosyaura-cart",
      version: 3,
      migrate: (persisted) => {
        const state = persisted as { currency?: string; items?: unknown[] };
        const currency = String(state.currency || "GHS").toUpperCase();
        return {
          ...state,
          currency: /^[A-Z]{3}$/.test(currency) ? currency : "GHS",
        };
      },
    }
  )
);

interface WishlistStore {
  items: string[];
  addItem: (fragranceId: string) => void;
  removeItem: (fragranceId: string) => void;
  toggleItem: (fragranceId: string) => void;
  hasItem: (fragranceId: string) => boolean;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (fragranceId) => {
        if (!get().items.includes(fragranceId)) {
          set({ items: [...get().items, fragranceId] });
        }
      },
      removeItem: (fragranceId) => {
        set({ items: get().items.filter((id) => id !== fragranceId) });
      },
      toggleItem: (fragranceId) => {
        if (get().items.includes(fragranceId)) {
          get().removeItem(fragranceId);
        } else {
          get().addItem(fragranceId);
        }
      },
      hasItem: (fragranceId) => get().items.includes(fragranceId),
    }),
    { name: "cosyaura-wishlist" }
  )
);
