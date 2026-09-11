"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { adminInputClass } from "@/components/admin/admin-ui";

function SetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("This link is invalid or incomplete.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not set password");
      setDone(true);
      setTimeout(() => router.push("/admin/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-red-600 text-center">
        Missing token. Use the link from your invite or reset email.
      </p>
    );
  }

  if (done) {
    return (
      <p className="text-sm text-green-700 text-center">
        Password saved. Redirecting to login…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="password"
        placeholder="New password (min 8)"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={adminInputClass}
        autoComplete="new-password"
      />
      <input
        type="password"
        placeholder="Confirm password"
        required
        minLength={8}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className={adminInputClass}
        autoComplete="new-password"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button type="submit" disabled={loading} className="btn-gold w-full disabled:opacity-50">
        {loading ? "Saving…" : "Set password"}
      </button>
    </form>
  );
}

export default function AdminSetPasswordPage() {
  return (
    <div className="admin-app min-h-screen bg-[#f7f6f3] flex items-center justify-center px-4">
      <div className="bg-white shadow-sm ring-1 ring-black/[0.04] rounded-2xl p-8 w-full max-w-md">
        <h1 className="font-playfair text-2xl text-[#03045e] text-center mb-2">Set admin password</h1>
        <p className="text-sm text-mocha text-center mb-8">
          Choose a password for your Cosy Aura admin account
        </p>
        <Suspense fallback={<p className="text-sm text-center text-mocha">Loading…</p>}>
          <SetPasswordForm />
        </Suspense>
        <p className="text-center text-sm mt-6">
          <Link href="/admin/login" className="text-gold underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
