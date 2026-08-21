"use client";

import { useEffect, useState } from "react";
import {
  readAdminBranchCookie,
  writeAdminBranchCookie,
} from "@/lib/admin-context";

type Branch = { id: string; name: string; country: string; isDefault: boolean };

export function AdminBranchSwitcher() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/context");
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.branches || []) as Branch[];
      setBranches(list);
      const cookie = readAdminBranchCookie();
      const initial =
        (cookie && list.some((b) => b.id === cookie) && cookie) ||
        list.find((b) => b.isDefault)?.id ||
        list[0]?.id ||
        "";
      setBranchId(initial);
      if (initial && initial !== cookie) writeAdminBranchCookie(initial);
    })();
  }, []);

  if (branches.length < 2) return null;

  return (
    <label className="hidden md:flex items-center gap-2 text-xs text-white/80">
      <span className="whitespace-nowrap">Act as</span>
      <select
        value={branchId}
        onChange={(e) => {
          const next = e.target.value;
          setBranchId(next);
          writeAdminBranchCookie(next || null);
          window.dispatchEvent(
            new CustomEvent("ca-admin-branch", { detail: { branchId: next } })
          );
        }}
        className="bg-white/10 border border-white/20 text-white text-xs px-2 py-1 max-w-[11rem]"
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id} className="text-espresso">
            {b.name} ({b.country})
          </option>
        ))}
      </select>
    </label>
  );
}
