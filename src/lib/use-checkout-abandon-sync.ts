"use client";

import { useEffect, useRef } from "react";
import type { CheckoutAbandonmentItem } from "@/lib/checkout-abandonment";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEBOUNCE_MS = 800;

export function useCheckoutAbandonSync(input: {
  email: string;
  items: CheckoutAbandonmentItem[];
  subtotalGhs: number;
  displayCurrency: string;
  shippingCountry: string;
  customerName?: string;
  customerPhone?: string;
  checkoutProvider: string;
  enabled?: boolean;
}) {
  const lastPayload = useRef("");

  useEffect(() => {
    if (input.enabled === false) return;
    const email = input.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return;
    if (!input.items.length) return;

    const payload = JSON.stringify({
      email,
      items: input.items,
      subtotalGhs: input.subtotalGhs,
      displayCurrency: input.displayCurrency,
      shippingCountry: input.shippingCountry,
      customerName: input.customerName?.trim() || "",
      customerPhone: input.customerPhone?.trim() || "",
      checkoutProvider: input.checkoutProvider,
    });

    if (payload === lastPayload.current) return;

    const timer = window.setTimeout(() => {
      lastPayload.current = payload;
      void fetch("/api/checkout/abandon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      }).catch(() => {
        lastPayload.current = "";
      });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [
    input.email,
    input.items,
    input.subtotalGhs,
    input.displayCurrency,
    input.shippingCountry,
    input.customerName,
    input.customerPhone,
    input.checkoutProvider,
    input.enabled,
  ]);
}
