"use client";

import { useEffect, useState } from "react";
import { PENDING_WHATSAPP_ORDER_KEY } from "@/lib/store-config-client";

/**
 * After Paystack (or other) success, open the pending WhatsApp order message
 * that was saved before redirecting to payment.
 */
export function OpenWhatsAppAfterPay() {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(PENDING_WHATSAPP_ORDER_KEY);
      if (!stored || !stored.startsWith("https://wa.me/")) return;
      sessionStorage.removeItem(PENDING_WHATSAPP_ORDER_KEY);
      setHref(stored);
    } catch {
      /* ignore */
    }
  }, []);

  if (!href) return null;

  return (
    <div className="mb-6 space-y-3">
      <p className="text-sm text-wf-gray">
        Payment confirmed. Send your order details to Cosy Aura on WhatsApp:
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 min-h-11 px-5 text-sm font-medium text-white bg-[#25D366] hover:bg-[#1ebe57] transition-colors"
      >
        Open WhatsApp order
      </a>
    </div>
  );
}
