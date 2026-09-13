"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import {
  AdminButton,
  AdminCard,
  adminInputClass,
  adminLabelClass,
} from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

const METHODS = [
  { id: "CASH", label: "Cash" },
  { id: "MOMO", label: "Mobile money" },
  { id: "CARD", label: "Card" },
  { id: "OTHER", label: "Other" },
] as const;

export function CreditContractDownPaymentForm({
  orderId,
  downPaymentGhs,
}: {
  orderId: string;
  downPaymentGhs: number;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("CASH");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/legal/credit-contracts/${orderId}/down-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            downPaymentMethod: method,
            downPaymentReference:
              method === "MOMO" || method === "CARD"
                ? reference.trim() || undefined
                : undefined,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not record down payment");
      }
      setReceiptUrl(data.receiptUrl as string);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record payment");
    } finally {
      setBusy(false);
    }
  };

  if (receiptUrl) {
    return (
      <AdminCard className="print:hidden border-emerald-200 bg-emerald-50/60">
        <p className="text-sm font-medium text-emerald-900">
          Contract signed and down payment recorded.
        </p>
        <p className="text-sm text-emerald-800 mt-1">
          The POS receipt is now ready to print.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <AdminButton href={receiptUrl} className="text-xs">
            Print receipt at POS
          </AdminButton>
          <Link
            href={receiptUrl}
            target="_blank"
            className="text-xs text-[#03045e] underline underline-offset-2"
          >
            Open in new tab
          </Link>
        </div>
      </AdminCard>
    );
  }

  return (
    <AdminCard className="print:hidden border-[#03045e]/15">
      <p className="text-sm font-medium text-[#03045e]">
        Record signed contract &amp; down payment (70%)
      </p>
      <p className="text-xs text-mocha mt-1 mb-4">
        After the customer signs the printed contract, record the GHS{" "}
        {downPaymentGhs.toFixed(2)} down payment. The POS receipt unlocks once
        this is saved.
      </p>

      <div className="space-y-3">
        <div>
          <p className={cn(adminLabelClass, "mb-2")}>Payment method</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={cn(
                  "py-2 text-sm border rounded-xl transition-colors",
                  method === m.id
                    ? "border-[#03045e] bg-[#03045e] text-white"
                    : "border-stone-200/80 hover:border-[#03045e]/40"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {(method === "MOMO" || method === "CARD") && (
          <div>
            <label className={adminLabelClass}>
              {method === "MOMO" ? "MoMo transaction ID" : "Card / auth reference"}
            </label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className={cn(adminInputClass, "mt-1 font-mono")}
              placeholder={method === "MOMO" ? "e.g. MTN ref" : "Auth code"}
            />
          </div>
        )}

        {error ? <p className="text-xs text-red-600">{error}</p> : null}

        <AdminButton
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="text-xs"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Confirm signed &amp; paid — unlock receipt
        </AdminButton>
      </div>
    </AdminCard>
  );
}
