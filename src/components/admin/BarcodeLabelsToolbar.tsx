"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminButton } from "@/components/admin/admin-ui";

export function BarcodeLabelsToolbar({
  labelCount,
  showGenerate,
}: {
  labelCount: number;
  showGenerate?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateAll() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/barcodes/backfill", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate barcodes");
      const parts: string[] = [];
      if (data.created > 0) parts.push(`${data.created} created`);
      if (data.updated > 0) parts.push(`${data.updated} updated`);
      setMessage(
        parts.length
          ? `Barcodes: ${parts.join(", ")}.`
          : "All barcodes are up to date."
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {showGenerate ? (
          <AdminButton
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void generateAll()}
            className="!py-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Generate missing
          </AdminButton>
        ) : null}
        <span className="text-xs text-mocha ml-auto sm:ml-0">
          {labelCount} label{labelCount === 1 ? "" : "s"} ready
        </span>
      </div>
      {message ? (
        <p className="text-sm text-emerald-800 bg-emerald-50 ring-1 ring-emerald-200/60 px-3 py-2">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700 bg-red-50 ring-1 ring-red-200/60 px-3 py-2">
          {error}
        </p>
      ) : null}
    </div>
  );
}
