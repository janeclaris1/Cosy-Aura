"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminButton, adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";

export function OrderTrackingForm({
  orderId,
  trackingNumber = "",
  trackingUrl = "",
  carrier = "",
  status,
}: {
  orderId: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  carrier?: string | null;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [number, setNumber] = useState(trackingNumber || "");
  const [url, setUrl] = useState(trackingUrl || "");
  const [carrierName, setCarrierName] = useState(carrier || "");
  const [markShipped, setMarkShipped] = useState(
    status !== "SHIPPED" && status !== "DELIVERED"
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: number,
          trackingUrl: url,
          carrier: carrierName,
          markShipped,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save tracking");
      }
      setMessage("Tracking details saved");
      if (data.trackingUrl && !url) setUrl(data.trackingUrl);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save tracking");
    }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div>
        <label className={adminLabelClass}>Carrier</label>
        <input
          value={carrierName}
          onChange={(e) => setCarrierName(e.target.value)}
          placeholder="DHL, FedEx, UPS…"
          className={adminInputClass}
        />
      </div>
      <div>
        <label className={adminLabelClass}>Tracking number</label>
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Tracking / AWB number"
          className={adminInputClass}
        />
      </div>
      <div>
        <label className={adminLabelClass}>Tracking URL (optional)</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className={adminInputClass}
        />
      </div>
      {status !== "SHIPPED" && status !== "DELIVERED" && (
        <label className="flex items-center gap-2 text-sm font-roboto text-espresso">
          <input
            type="checkbox"
            checked={markShipped}
            onChange={(e) => setMarkShipped(e.target.checked)}
          />
          Mark order as shipped
        </label>
      )}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      <AdminButton type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save tracking"}
      </AdminButton>
    </form>
  );
}
