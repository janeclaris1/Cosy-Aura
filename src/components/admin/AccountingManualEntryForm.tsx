"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AdminButton,
  AdminCard,
  adminInputClass,
  adminLabelClass,
  adminSelectClass,
} from "@/components/admin/admin-ui";
import { readAdminJson } from "@/lib/admin-fetch";
import type { ManualEntryKind } from "@/lib/accounting-manual";

type Account = { code: string; name: string; type: string };

const ENTRY_TYPES: {
  id: ManualEntryKind;
  label: string;
  hint: string;
  cashFlow: string;
}[] = [
  {
    id: "OTHER_INCOME",
    label: "Other business income",
    hint: "Commissions, consulting, interest, or any non-order revenue.",
    cashFlow: "Operating — other cash inflows",
  },
  {
    id: "CAPITAL_INJECTION",
    label: "Owner capital injection",
    hint: "Cash the owner puts into the business.",
    cashFlow: "Financing — capital injected",
  },
  {
    id: "OWNER_WITHDRAWAL",
    label: "Owner withdrawal",
    hint: "Cash taken out by the owner (not salary).",
    cashFlow: "Financing — owner withdrawals",
  },
  {
    id: "EQUIPMENT_PURCHASE",
    label: "Buy equipment or POS",
    hint: "Shop fixtures, POS hardware, or other long-term assets.",
    cashFlow: "Investing — asset purchases",
  },
  {
    id: "ASSET_DISPOSAL",
    label: "Sell equipment or POS",
    hint: "Cash received from selling store equipment or POS.",
    cashFlow: "Investing — asset sale proceeds",
  },
];

export function AccountingManualEntryForm({ onRecorded }: { onRecorded?: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    kind: "OTHER_INCOME" as ManualEntryKind,
    amount: "",
    entryDate: new Date().toISOString().slice(0, 10),
    cashAccount: "BANK" as "BANK" | "MOMO" | "CASH",
    assetAccountCode: "1300",
    revenueAccountCode: "4090",
    memo: "",
  });

  const selectedType = useMemo(
    () => ENTRY_TYPES.find((t) => t.id === form.kind),
    [form.kind]
  );

  const assetAccounts = useMemo(
    () => accounts.filter((a) => a.code === "1300" || a.code === "1310"),
    [accounts]
  );

  const revenueAccounts = useMemo(
    () => accounts.filter((a) => a.type === "REVENUE"),
    [accounts]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await readAdminJson<{ accounts: Account[] }>(
        await fetch("/api/admin/accounting/accounts")
      );
      if (cancelled) return;
      if (res.ok) {
        setAccounts(res.data.accounts || []);
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

    const payload: Record<string, unknown> = {
      kind: form.kind,
      amount: Number(form.amount),
      entryDate: form.entryDate,
      cashAccount: form.cashAccount,
      memo: form.memo || undefined,
    };

    if (form.kind === "EQUIPMENT_PURCHASE" || form.kind === "ASSET_DISPOSAL") {
      payload.assetAccountCode = form.assetAccountCode;
    }
    if (form.kind === "OTHER_INCOME") {
      payload.revenueAccountCode = form.revenueAccountCode;
    }

    const res = await readAdminJson(
      await fetch("/api/admin/accounting/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    );

    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }

    setMessage("Entry posted to the ledger. Check Reports → Cash flow for the updated section.");
    setForm((f) => ({ ...f, amount: "", memo: "" }));
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
      <p className="text-sm text-mocha mb-4">
        Record cash movements that are not shop orders, payroll, expenses, or loans. Entries
        appear automatically on the cash flow statement under Operating, Investing, or
        Financing.
      </p>
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={adminLabelClass}>Entry type</label>
          <select
            className={adminSelectClass}
            value={form.kind}
            onChange={(e) =>
              setForm((f) => ({ ...f, kind: e.target.value as ManualEntryKind }))
            }
          >
            {ENTRY_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          {selectedType ? (
            <p className="mt-1.5 text-xs text-mocha/80">
              {selectedType.hint}{" "}
              <span className="text-[#03045e]">→ {selectedType.cashFlow}</span>
            </p>
          ) : null}
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
          <label className={adminLabelClass}>
            {form.kind === "OWNER_WITHDRAWAL" || form.kind === "EQUIPMENT_PURCHASE"
              ? "Paid from"
              : "Received into"}
          </label>
          <select
            className={adminSelectClass}
            value={form.cashAccount}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                cashAccount: e.target.value as "BANK" | "MOMO" | "CASH",
              }))
            }
          >
            <option value="BANK">1010 — Cash in Bank</option>
            <option value="MOMO">1020 — Mobile Money</option>
            <option value="CASH">1030 — Petty Cash</option>
          </select>
        </div>

        {(form.kind === "EQUIPMENT_PURCHASE" || form.kind === "ASSET_DISPOSAL") && (
          <div>
            <label className={adminLabelClass}>Asset account</label>
            <select
              className={adminSelectClass}
              value={form.assetAccountCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, assetAccountCode: e.target.value }))
              }
            >
              {assetAccounts.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {form.kind === "OTHER_INCOME" && (
          <div>
            <label className={adminLabelClass}>Revenue account</label>
            <select
              className={adminSelectClass}
              value={form.revenueAccountCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, revenueAccountCode: e.target.value }))
              }
            >
              {revenueAccounts.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className={adminLabelClass}>Notes (optional)</label>
          <input
            className={adminInputClass}
            value={form.memo}
            onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
            placeholder="Source, reference, description…"
          />
        </div>

        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <AdminButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Post entry"}
          </AdminButton>
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </form>
    </AdminCard>
  );
}
