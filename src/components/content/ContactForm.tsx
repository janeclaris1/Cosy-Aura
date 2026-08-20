"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

const TOPICS = [
  { value: "Request a Fragrance", label: "Request a Fragrance" },
  { value: "Product enquiry", label: "Product enquiry" },
  { value: "Order support", label: "Order support" },
  { value: "Shipping & delivery", label: "Shipping & delivery" },
  { value: "Returns", label: "Returns" },
  { value: "Other", label: "Something else" },
] as const;

const fieldClass =
  "w-full bg-transparent border-0 border-b border-wf-border rounded-none px-0 py-3 text-sm text-wf-black font-cantora placeholder:text-wf-gray/70 focus:outline-none focus:border-gold transition-colors duration-300";

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
      <div className="animate-fade-up py-10 md:py-14 font-cantora">
        <p className="text-xs uppercase tracking-[0.25em] text-gold mb-4">
          Message received
        </p>
        <h3 className="text-3xl text-wf-black mb-4">
          Thank you for writing to us
        </h3>
        <p className="text-wf-gray leading-relaxed max-w-md mb-8">
          We&apos;ll review your note and reply within one business day. For order
          questions, keep your order number handy.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="btn-outline font-cantora"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8 animate-fade-up font-cantora">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <label className="block group">
          <span className="block text-[11px] uppercase tracking-[0.18em] text-wf-gray mb-1 group-focus-within:text-gold transition-colors">
            Name
          </span>
          <input
            name="name"
            required
            autoComplete="name"
            className={fieldClass}
            placeholder="Full name"
          />
        </label>
        <label className="block group">
          <span className="block text-[11px] uppercase tracking-[0.18em] text-wf-gray mb-1 group-focus-within:text-gold transition-colors">
            Email
          </span>
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

      <label className="block group">
        <span className="block text-[11px] uppercase tracking-[0.18em] text-wf-gray mb-1 group-focus-within:text-gold transition-colors">
          Topic
        </span>
        <select
          name="topic"
          required
          defaultValue={defaultTopic}
          className={`${fieldClass} bg-white cursor-pointer`}
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

      <label className="block group">
        <span className="block text-[11px] uppercase tracking-[0.18em] text-wf-gray mb-1 group-focus-within:text-gold transition-colors">
          Subject
        </span>
        <input
          name="subject"
          defaultValue={
            subjectFromUrl && !TOPICS.some((t) => t.value === subjectFromUrl)
              ? subjectFromUrl
              : ""
          }
          className={fieldClass}
          placeholder="Optional - e.g. Chanel No.5 availability"
        />
      </label>

      <label className="block group">
        <span className="block text-[11px] uppercase tracking-[0.18em] text-wf-gray mb-1 group-focus-within:text-gold transition-colors">
          Message
        </span>
        <textarea
          name="message"
          required
          rows={6}
          className={`${fieldClass} resize-none pt-3`}
          placeholder="Share as much detail as you can - fragrance name, order number, or question."
        />
      </label>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={status === "sending"}
          className="btn-gold disabled:opacity-60 min-w-[180px] font-cantora"
        >
          {status === "sending" ? "Sending…" : "Send message"}
        </button>
        <p className="text-xs text-wf-gray leading-relaxed max-w-xs">
          We typically reply Monday-Friday within one business day.
        </p>
      </div>

      {status === "error" && (
        <p className="text-sm text-red-600 animate-fade-up">
          Something went wrong. Please try again or email{" "}
          <a
            href="mailto:support@cosyaura.com"
            className="underline hover:text-gold"
          >
            support@cosyaura.com
          </a>
          .
        </p>
      )}
    </form>
  );
}
