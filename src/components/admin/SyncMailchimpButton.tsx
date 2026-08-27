"use client";

import { useState } from "react";

export function SyncMailchimpButton({
  configured,
  count,
}: {
  configured: boolean;
  count: number;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/subscribers/sync-mailchimp", {
        method: "POST",
      });
      const data = (await res.json()) as {
        error?: string;
        synced?: number;
        failed?: number;
        total?: number;
      };
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setMessage(
        `Synced ${data.synced ?? 0} of ${data.total ?? count} to Mailchimp` +
          (data.failed ? ` (${data.failed} failed)` : "")
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={busy || !configured || count === 0}
        onClick={() => void sync()}
        className="btn-gold text-sm py-2 px-4 disabled:opacity-50"
        title={
          configured
            ? "Push all local subscribers to Mailchimp"
            : "Set MAILCHIMP_API_KEY and MAILCHIMP_AUDIENCE_ID in .env"
        }
      >
        {busy ? "Syncing…" : "Sync to Mailchimp"}
      </button>
      {!configured ? (
        <p className="text-xs text-wf-gray text-right max-w-xs">
          Add MAILCHIMP_API_KEY and MAILCHIMP_AUDIENCE_ID to enable sync.
        </p>
      ) : null}
      {message ? <p className="text-xs text-green-700">{message}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
