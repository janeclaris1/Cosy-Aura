"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/store";
import { trackMetaPurchase } from "@/lib/meta-pixel";

/** Clears the cart after a successful checkout return, and fires Meta Purchase. */
export function ClearCartOnSuccess() {
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    const { items, currency } = useCartStore.getState();
    const value = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const params = new URLSearchParams(window.location.search);
    const eventID =
      params.get("session_id") ||
      params.get("reference") ||
      params.get("trxref") ||
      params.get("tx_ref") ||
      params.get("transaction_id") ||
      "";

    const dedupeKey = eventID ? `meta_purchase_${eventID}` : "";
    const alreadySent = dedupeKey ? sessionStorage.getItem(dedupeKey) : null;

    if (items.length > 0 && value > 0 && !alreadySent) {
      trackMetaPurchase({
        value,
        currency: currency || "GHS",
        eventID: eventID || undefined,
        contents: items.map((i) => ({
          id: i.fragranceId,
          quantity: i.quantity,
          item_price: i.price,
        })),
      });
      if (dedupeKey) sessionStorage.setItem(dedupeKey, "1");
    }

    clearCart();
  }, [clearCart]);

  return null;
}
