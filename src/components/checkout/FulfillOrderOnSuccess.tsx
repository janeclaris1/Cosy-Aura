"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export function FulfillOrderOnSuccess() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const txRef = searchParams.get("tx_ref") || "";
  const transactionId = searchParams.get("transaction_id") || "";
  const flwStatus = (searchParams.get("status") || "").toLowerCase();
  const reference =
    searchParams.get("reference") || searchParams.get("trxref") || txRef;
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (txRef && flwStatus && !["successful", "completed"].includes(flwStatus)) {
      setStatus("error");
      setMessage("Payment was not completed. You can return to checkout and try again.");
      return;
    }

    if ((!sessionId && !reference && !transactionId) || status !== "idle") return;

    let cancelled = false;
    setStatus("working");

    const isFlutterwave = Boolean(txRef || transactionId);

    (async () => {
      try {
        const res = await fetch("/api/checkout/fulfill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            sessionId
              ? { sessionId }
              : isFlutterwave
                ? { provider: "flutterwave", txRef: txRef || reference, transactionId }
                : { reference }
          ),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setStatus("error");
          setMessage(data.reason || data.error || "Could not confirm order");
          return;
        }
        setStatus("done");
        if (data.emailSent === false) {
          setStatus("error");
          setMessage(
            data.emailError
              ? `Order paid, but confirmation email failed: ${data.emailError}`
              : "Order paid, but confirmation email failed. Contact support."
          );
          return;
        }
        if (data.reason === "Already fulfilled") {
          setMessage("Order already confirmed.");
        } else {
          setMessage("Confirmation email sent.");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Could not confirm order email.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, reference, txRef, transactionId, flwStatus, status]);

  if (!sessionId && !reference && !transactionId && status === "idle") return null;

  return (
    <p className="text-sm text-wf-gray mb-4">
      {status === "working" && "Confirming your order…"}
      {status === "done" && (message || "Order confirmed.")}
      {status === "error" && (
        <span className="text-amber-700">
          {message} If you were charged, contact support with your payment reference.
        </span>
      )}
    </p>
  );
}
