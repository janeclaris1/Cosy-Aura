"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-stone-100 text-stone-700 ring-stone-200/80",
  PAID: "bg-sky-50 text-sky-800 ring-sky-200/80",
  PROCESSING: "bg-amber-50 text-amber-900 ring-amber-200/80",
  SHIPPED: "bg-indigo-50 text-indigo-800 ring-indigo-200/80",
  DELIVERED: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  CANCELLED: "bg-red-50 text-red-700 ring-red-200/80",
  REFUNDED: "bg-stone-50 text-stone-600 ring-stone-200/70",
};

function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

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

      window.dispatchEvent(new CustomEvent("admin:orders-changed"));
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setValue(previous);
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  return (
    <div className="inline-flex flex-col gap-1 min-w-[7.5rem]">
      <div className="relative">
        <select
          value={value}
          disabled={pending}
          onChange={(e) => {
            void updateStatus(e.target.value);
          }}
          className={cn(
            "w-full appearance-none rounded-xl pl-3 pr-8 py-2 text-xs font-medium ring-1 cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-[#03045e]/20 disabled:opacity-60 transition-colors",
            STATUS_STYLES[value] || STATUS_STYLES.PENDING
          )}
        >
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="PROCESSING">Processing</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <span
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] opacity-60"
          aria-hidden
        >
          ▾
        </span>
      </div>
      {error ? <span className="text-[10px] text-red-600">{error}</span> : null}
    </div>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ring-1",
        STATUS_STYLES[status] || STATUS_STYLES.PENDING
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
