"use client";

import { useEffect, useState } from "react";
import {
  readAdminBranchCookie,
  writeAdminBranchCookie,
} from "@/lib/admin-context";
import {
  AdminBranchSelect,
  type AdminBranchOption,
} from "@/components/admin/AdminBranchSelect";

export function AdminBranchSwitcher() {
  const [branches, setBranches] = useState<AdminBranchOption[]>([]);
  const [branchId, setBranchId] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/context");
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.branches || []) as AdminBranchOption[];
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

  return (
    <AdminBranchSelect
      branches={branches}
      value={branchId}
      onChange={(next) => {
        setBranchId(next);
        writeAdminBranchCookie(next || null);
        window.dispatchEvent(
          new CustomEvent("ca-admin-branch", { detail: { branchId: next } })
        );
      }}
      label="Active branch"
      variant="sidebar"
      hideWhenSingle
    />
  );
}
