"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function CustomerCreditToggle({
  userId,
  approved,
  canEdit,
}: {
  userId: string;
  approved: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(approved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    if (!canEdit || busy) return;
    const next = !value;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customers/${userId}/credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Could not update credit approval"
        );
      }
      setValue(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  if (!canEdit) {
    return (
      <span
        className={cn(
          "inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide ring-1",
          value
            ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80"
            : "bg-stone-50 text-stone-500 ring-stone-200/70"
        )}
      >
        {value ? "Approved" : "Not approved"}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide ring-1 transition-colors disabled:opacity-60",
          value
            ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80 hover:bg-emerald-100"
            : "bg-stone-50 text-stone-600 ring-stone-200/70 hover:bg-stone-100"
        )}
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        {value ? "Credit approved" : "Approve credit"}
      </button>
      {error ? <span className="text-[10px] text-red-600">{error}</span> : null}
    </div>
  );
}
