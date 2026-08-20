"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EnquiryActions({ id, read }: { id: string; read: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await fetch(`/api/admin/enquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: !read }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className="text-xs text-gold hover:underline disabled:opacity-50"
    >
      {read ? "Mark unread" : "Mark read"}
    </button>
  );
}
