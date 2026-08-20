"use client";

import { useState } from "react";

export function ResendOrderEmailButton({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  async function onClick() {
    setStatus("working");
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/resend-email`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error || "Failed to send email");
        return;
      }
      setStatus("done");
      setMessage("Confirmation email sent.");
    } catch {
      setStatus("error");
      setMessage("Failed to send email");
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={status === "working"}
        className="text-sm border border-wf-border rounded px-3 py-1.5 hover:border-gold hover:text-gold disabled:opacity-50"
      >
        {status === "working" ? "Sending…" : "Resend confirmation email"}
      </button>
      {message && (
        <p
          className={`text-xs ${
            status === "error" ? "text-amber-700" : "text-wf-gray"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
