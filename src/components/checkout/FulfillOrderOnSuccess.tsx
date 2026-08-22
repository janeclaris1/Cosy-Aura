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
        const parts: string[] = [];
        if (data.emailSent === false) {
          parts.push(
            data.emailError
              ? `Confirmation email failed: ${data.emailError}`
              : "Confirmation email could not be sent."
          );
        } else if (data.reason === "Already fulfilled") {
          parts.push("Order already confirmed.");
        } else {
          parts.push("Confirmation email sent.");
        }
        if (data.customerWhatsAppOk === false) {
          parts.push(
            data.whatsappError ||
              "WhatsApp receipt to your phone could not be sent. Use an approved WhatsApp sender (not Twilio sandbox) and ensure your number includes country code."
          );
        } else if (data.customerWhatsAppOk === true) {
          parts.push("WhatsApp receipt sent to your phone.");
        }
        if (parts.some((p) => p.includes("failed") || p.includes("could not"))) {
          setStatus("error");
        }
        setMessage(parts.join(" "));
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
