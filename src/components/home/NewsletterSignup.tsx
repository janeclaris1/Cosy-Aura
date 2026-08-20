"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useT } from "@/lib/locale-store";
import { MEMBER_DISCOUNT_PERCENT } from "@/lib/pricing";

export function NewsletterSignup() {
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email,
          phone,
          password,
          subscribeNewsletter: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create account");
        setStatus("error");
        return;
      }

      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created — please sign in to unlock your discount.");
        setStatus("error");
        return;
      }

      setStatus("success");
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <section className="py-16 px-4 bg-wf-light">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-playfair text-3xl mb-3">{t("home.newsletterTitle")}</h2>
        <p className="text-wf-gray mb-8">
          Create a free account for email updates and a permanent{" "}
          {MEMBER_DISCOUNT_PERCENT}% member discount on every order.
        </p>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 max-w-md mx-auto text-left"
        >
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 border border-wf-border rounded bg-white text-sm focus:outline-none focus:border-gold"
          />
          <input
            type="email"
            placeholder={t("home.newsletterEmail")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-wf-border rounded bg-white text-sm focus:outline-none focus:border-gold"
          />
          <input
            type="tel"
            placeholder="Phone / WhatsApp (e.g. +233…)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
            className="w-full px-4 py-3 border border-wf-border rounded bg-white text-sm focus:outline-none focus:border-gold"
          />
          <input
            type="password"
            placeholder="Create password (min. 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full px-4 py-3 border border-wf-border rounded bg-white text-sm focus:outline-none focus:border-gold"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="btn-gold shrink-0 disabled:opacity-50"
          >
            {status === "loading"
              ? t("common.loading")
              : `Create account · ${MEMBER_DISCOUNT_PERCENT}% off`}
          </button>
        </form>
        {status === "success" && (
          <p className="text-sm text-green-600 mt-3">
            Welcome — your {MEMBER_DISCOUNT_PERCENT}% member discount is active when you shop signed in.
          </p>
        )}
        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
        <p className="text-xs text-wf-gray mt-4">
          Already have an account?{" "}
          <Link href="/account/login" className="text-gold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
