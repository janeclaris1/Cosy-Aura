"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { SocialAuthButtons } from "@/components/account/SocialAuthButtons";

const OAUTH_ERRORS: Record<string, string> = {
  OAuthAccountNotLinked:
    "This email is already registered. Sign in with email and password, or the social account you used first.",
  OAuthSignin: "Could not start social sign-in. Please try again.",
  OAuthCallback: "Social sign-in was cancelled or failed. Please try again.",
  OAuthCreateAccount: "Could not create your account from that social login.",
  Callback: "Sign-in callback failed. Please try again.",
  AccessDenied: "Access was denied. Please try another method.",
};

export default function CustomerLoginForm({
  oauthError,
}: {
  oauthError?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(OAUTH_ERRORS[oauthError || ""] || "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-6">
          <BrandLogo size="md" />
        </div>
        <h1 className="font-playfair text-3xl mb-2">Sign in</h1>
        <p className="text-sm text-wf-gray">
          Access your account, orders, and wishlist.
        </p>
      </div>

      <div className="mb-6">
        <SocialAuthButtons />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
          <label htmlFor="password" className="block text-sm mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-wf-border text-sm focus:outline-none focus:border-gold bg-white"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="btn-gold w-full disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="text-sm text-wf-gray text-center mt-6">
        New here?{" "}
        <Link href="/account/register" className="text-gold hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
