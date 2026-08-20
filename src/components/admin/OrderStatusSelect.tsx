"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function OrderStatusSelect({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(nextStatus: string) {
    setError(null);
    const previous = value;
    setValue(nextStatus);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update status");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setValue(previous);
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <select
        value={value}
        disabled={pending}
        onChange={(e) => {
          void updateStatus(e.target.value);
        }}
        className="text-xs border border-wf-border rounded px-2 py-1 bg-white disabled:opacity-60"
      >
        <option value="PENDING">Pending</option>
        <option value="PAID">Paid</option>
        <option value="PROCESSING">Processing</option>
        <option value="SHIPPED">Shipped</option>
        <option value="DELIVERED">Delivered</option>
        <option value="CANCELLED">Cancelled</option>
        <option value="REFUNDED">Refunded</option>
      </select>
      {error ? <span className="text-[10px] text-red-600">{error}</span> : null}
    </div>
  );
}
