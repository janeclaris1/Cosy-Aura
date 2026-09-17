"use client";

import { useState } from "react";
import { AdminButton } from "@/components/admin/admin-ui";

export function SendRecoveryEmailButton({
  abandonmentId,
  alreadySent,
}: {
  abandonmentId: string;
  alreadySent: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onClick() {
    setStatus("working");
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/abandoned-checkouts/${abandonmentId}/send-recovery`,
        { method: "POST" }
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error || "Failed to send email");
        return;
      }
      setStatus("done");
      setMessage("Recovery email sent.");
    } catch {
      setStatus("error");
      setMessage("Failed to send email");
    }
  }

  return (
    <div className="space-y-1">
      <AdminButton
        type="button"
        variant="ghost"
        className="!px-0 !py-0 !min-h-0 text-xs h-auto font-medium"
        disabled={status === "working"}
        onClick={() => void onClick()}
      >
        {status === "working"
          ? "Sending…"
          : alreadySent
            ? "Resend recovery"
            : "Send recovery"}
      </AdminButton>
      {message ? (
        <p
          className={`text-[10px] leading-snug ${
            status === "error" ? "text-amber-800" : "text-mocha"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
