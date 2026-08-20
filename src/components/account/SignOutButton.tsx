"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/account/login" })}
      className="btn-outline w-full text-center block text-sm"
    >
      Sign out
    </button>
  );
}
