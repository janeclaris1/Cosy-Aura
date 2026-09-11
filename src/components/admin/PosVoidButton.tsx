"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function PosVoidButton({
  orderId,
  receiptNumber,
  disabled,
}: {
  orderId: string;
  receiptNumber?: string | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVoid() {
    const label = receiptNumber || orderId.slice(0, 8).toUpperCase();
    if (
      !confirm(
        `Void POS sale ${label}? Branch stock will be restored. This cannot be undone.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pos/void", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Void failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void handleVoid()}
        disabled={disabled || busy}
        className="text-sm border border-red-300 text-red-700 px-4 py-2 hover:bg-red-50 disabled:opacity-40 inline-flex items-center gap-2"
      >
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Void sale & restore stock
      </button>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
