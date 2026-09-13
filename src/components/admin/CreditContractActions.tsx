"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminButton } from "@/components/admin/admin-ui";
import { CreditContractPrintButton } from "@/components/admin/CreditContractPrintButton";

export function CreditContractActions({
  orderId,
  approved,
  voided,
}: {
  orderId: string;
  approved: boolean;
  voided: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approveAndPrint = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/legal/credit-contracts/${orderId}/approve`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not approve contract");
      }
      router.refresh();
      window.setTimeout(() => window.print(), 300);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve contract");
    } finally {
      setBusy(false);
    }
  };

  if (voided) return null;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {!approved ? (
          <AdminButton
            type="button"
            onClick={() => void approveAndPrint()}
            disabled={busy}
            className="text-xs"
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            Generate &amp; print contract (A4)
          </AdminButton>
        ) : (
          <CreditContractPrintButton />
        )}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
