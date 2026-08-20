"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkNotificationsRead() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function markAll() {
    setLoading(true);
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={markAll}
      disabled={loading}
      className="btn-outline text-sm py-2 px-4 disabled:opacity-50"
    >
      {loading ? "Updating..." : "Mark all read"}
    </button>
  );
}
