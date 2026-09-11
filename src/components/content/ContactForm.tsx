"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TOPICS = [
  { value: "Request a Fragrance", label: "Request a Fragrance" },
  { value: "Product enquiry", label: "Product enquiry" },
  { value: "Order support", label: "Order support" },
  { value: "Shipping & delivery", label: "Shipping & delivery" },
  { value: "Returns", label: "Returns" },
  { value: "Other", label: "Something else" },
] as const;

const labelClass =
  "block text-[10px] uppercase tracking-[0.16em] text-mocha mb-1.5";

const fieldClass =
  "w-full bg-[#fafafa] border border-stone-200/90 px-3 py-2.5 text-sm text-[#03045e] placeholder:text-mocha/60 focus:outline-none focus:border-[#03045e]/50 focus:bg-white transition-colors";

export function ContactForm() {
  const searchParams = useSearchParams();
  const subjectFromUrl = searchParams.get("subject")?.trim() || "";
  const defaultTopic = TOPICS.some((t) => t.value === subjectFromUrl)
    ? subjectFromUrl
    : subjectFromUrl
      ? "Request a Fragrance"
      : "";
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const data = new FormData(form);
    const topic = String(data.get("topic") || "Enquiry");
    const subjectLine = String(data.get("subject") || "").trim();

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          subject: subjectLine ? `${topic}: ${subjectLine}` : topic,
          message: data.get("message"),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="text-center py-6 sm:py-10 animate-fade-up">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#0077b6] mb-3">
          Message received
        </p>
        <h2 className="font-playfair text-2xl sm:text-3xl text-[#03045e] mb-3">
          Thank you for writing to us
        </h2>
        <p className="text-sm text-mocha leading-relaxed max-w-sm mx-auto mb-8">
          We&apos;ll review your note and reply within one business day. For order
          questions, keep your order number handy.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium border border-stone-200/90 text-[#03045e] hover:bg-[#fafafa] transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 animate-fade-up">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <label className="block">
          <span className={labelClass}>Name</span>
          <input
            name="name"
            required
            autoComplete="name"
            className={fieldClass}
            placeholder="Full name"
          />
        </label>
        <label className="block">
          <span className={labelClass}>Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={fieldClass}
            placeholder="you@example.com"
          />
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>Topic</span>
        <select
          name="topic"
          required
          defaultValue={defaultTopic}
          className={cn(fieldClass, "cursor-pointer appearance-none")}
        >
          <option value="" disabled>
            What is this about?
          </option>
          {TOPICS.map((topic) => (
            <option key={topic.value} value={topic.value}>
              {topic.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelClass}>Subject</span>
        <input
          name="subject"
          defaultValue={
            subjectFromUrl && !TOPICS.some((t) => t.value === subjectFromUrl)
              ? subjectFromUrl
              : ""
          }
          className={fieldClass}
          placeholder="Optional, e.g. Chanel No.5 availability"
        />
      </label>

      <label className="block">
        <span className={labelClass}>Message</span>
        <textarea
          name="message"
          required
          rows={5}
          className={cn(fieldClass, "resize-none min-h-[8rem]")}
          placeholder="Share as much detail as you can: fragrance name, order number, or question."
        />
      </label>

      <p className="text-xs text-mocha leading-relaxed pt-1">
        By submitting this form, you agree that Cosy Aura may contact you about your
        enquiry. See our{" "}
        <a href="/privacy" className="text-[#03045e] underline underline-offset-2">
          Privacy Policy
        </a>
        .
      </p>

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full bg-[#03045e] text-white text-sm font-medium py-3.5 hover:bg-[#020338] disabled:opacity-60 transition-colors"
      >
        {status === "sending" ? "Sending…" : "Send message"}
      </button>

      <p className="text-xs text-mocha text-center">
        We typically reply Monday to Friday within one business day.
      </p>

      {status === "error" && (
        <p className="text-sm text-red-600 text-center animate-fade-up">
          Something went wrong. Please try again or email{" "}
          <a
            href="mailto:support@cosyaura.com"
            className="underline hover:text-[#03045e]"
          >
            support@cosyaura.com
          </a>
          .
        </p>
      )}
    </form>
  );
}
