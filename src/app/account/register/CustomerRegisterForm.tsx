"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { SocialAuthButtons } from "@/components/account/SocialAuthButtons";

export default function CustomerRegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          subscribeNewsletter: true,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not create account");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/account/login");
        return;
      }

      router.push("/account");
      router.refresh();
    } catch {
      setError("Could not create account");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-6">
          <BrandLogo size="md" />
        </div>
        <h1 className="font-playfair text-3xl mb-2">Create account</h1>
        <p className="text-sm text-wf-gray">
          Join the Cosy Aura list and unlock a permanent 5% member discount on
          every order when you shop signed in.
        </p>
      </div>

      <div className="mb-6">
        <SocialAuthButtons />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm mb-1.5">
            Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 border border-wf-border text-sm focus:outline-none focus:border-gold bg-white"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-wf-border text-sm focus:outline-none focus:border-gold bg-white"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm mb-1.5">
            Phone / WhatsApp
          </label>
          <input
            id="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="+233…"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 border border-wf-border text-sm focus:outline-none focus:border-gold bg-white"
          />
          <p className="text-xs text-wf-gray mt-1.5">Include country code</p>
        </div>
        <div>
          <label htmlFor="password" className="block text-sm mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-wf-border text-sm focus:outline-none focus:border-gold bg-white"
          />
          <p className="text-xs text-wf-gray mt-1.5">At least 8 characters</p>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="btn-gold w-full disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-sm text-wf-gray text-center mt-6">
        Already have an account?{" "}
        <Link href="/account/login" className="text-gold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
