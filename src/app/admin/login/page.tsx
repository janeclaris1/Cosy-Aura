"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      portal: "admin",
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/admin");
    }
  }

  return (
    <div className="admin-app min-h-screen bg-[#f7f6f3] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-[10px] uppercase tracking-[0.22em] text-mocha mb-2">Cosy Aura</p>
          <h1 className="font-playfair text-3xl text-[#03045e]">Admin sign in</h1>
          <p className="text-sm text-mocha mt-2">Manage your store, stock, and sales</p>
        </div>

        <div className="bg-white shadow-sm ring-1 ring-black/[0.04] p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[10px] uppercase tracking-[0.14em] text-mocha mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-200/90 bg-[#fafafa] text-sm focus:outline-none focus:border-[#03045e]/40 focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-[10px] uppercase tracking-[0.14em] text-mocha mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-200/90 bg-[#fafafa] text-sm focus:outline-none focus:border-[#03045e]/40 focus:bg-white transition-colors"
              />
            </div>
            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#03045e] text-white text-sm font-medium py-3 hover:bg-[#020338] disabled:opacity-50 inline-flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-mocha mt-6">
          <Link href="/" className="text-[#03045e] hover:underline">
            ← Back to storefront
          </Link>
        </p>
      </div>
    </div>
  );
}
