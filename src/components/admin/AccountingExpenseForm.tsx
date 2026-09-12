"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AdminButton,
  AdminCard,
  adminInputClass,
  adminLabelClass,
  adminSelectClass,
} from "@/components/admin/admin-ui";
import { readAdminJson } from "@/lib/admin-fetch";

type Account = { code: string; name: string; type: string };

export function AccountingExpenseForm({ onRecorded }: { onRecorded?: () => void }) {
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    accountCode: "6200",
    amount: "",
    entryDate: new Date().toISOString().slice(0, 10),
    paidFrom: "BANK" as "BANK" | "MOMO" | "CASH",
    vendor: "",
    memo: "",
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await readAdminJson<{ accounts: Account[] }>(
        await fetch("/api/admin/accounting/accounts")
      );
      if (cancelled) return;
      if (res.ok) {
        const opEx = (res.data.accounts || []).filter(
          (a) => a.type === "EXPENSE" && a.code >= "6200"
        );
        setExpenseAccounts(opEx);
        if (opEx.length && !opEx.some((a) => a.code === form.accountCode)) {
          setForm((f) => ({ ...f, accountCode: opEx[0].code }));
        }
      } else {
        setError(res.error);
      }
      setLoadingAccounts(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const res = await readAdminJson(
      await fetch("/api/admin/accounting/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
        }),
      })
    );

    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }

    setMessage("Expense recorded in the ledger.");
    setForm((f) => ({ ...f, amount: "", vendor: "", memo: "" }));
    onRecorded?.();
  }

  if (loadingAccounts) {
    return (
      <div className="flex items-center gap-2 text-sm text-mocha py-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading accounts…
      </div>
    );
  }

  return (
    <AdminCard>
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={adminLabelClass}>Expense account</label>
          <select
            className={adminSelectClass}
            value={form.accountCode}
            onChange={(e) => setForm((f) => ({ ...f, accountCode: e.target.value }))}
          >
            {expenseAccounts.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={adminLabelClass}>Amount (GHS)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            className={adminInputClass}
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
        </div>
        <div>
          <label className={adminLabelClass}>Date</label>
          <input
            type="date"
            required
            className={adminInputClass}
            value={form.entryDate}
            onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))}
          />
        </div>
        <div>
          <label className={adminLabelClass}>Paid from</label>
          <select
            className={adminSelectClass}
            value={form.paidFrom}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                paidFrom: e.target.value as "BANK" | "MOMO" | "CASH",
              }))
            }
          >
            <option value="BANK">1010 — Cash in Bank</option>
            <option value="MOMO">1020 — Mobile Money</option>
            <option value="CASH">1030 — Petty Cash</option>
          </select>
        </div>
        <div>
          <label className={adminLabelClass}>Vendor (optional)</label>
          <input
            className={adminInputClass}
            value={form.vendor}
            onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
            placeholder="Supplier or payee"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={adminLabelClass}>Notes</label>
          <input
            className={adminInputClass}
            value={form.memo}
            onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
            placeholder="Invoice ref, description…"
          />
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <AdminButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Record expense"}
          </AdminButton>
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </form>
    </AdminCard>
  );
}
