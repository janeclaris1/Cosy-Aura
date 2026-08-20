"use client";

import { useMemo, useState } from "react";
import type { StoreConfigPayload, WhatsAppCheckoutNumbers } from "@/lib/store-config";

const SUGGESTED = [
  { code: "GH", label: "Ghana" },
  { code: "CM", label: "Cameroon" },
  { code: "NG", label: "Nigeria" },
  { code: "CI", label: "Côte d'Ivoire" },
  { code: "KE", label: "Kenya" },
  { code: "ZA", label: "South Africa" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
] as const;

type Row = { code: string; phone: string };

function numbersToRows(map: WhatsAppCheckoutNumbers): Row[] {
  const entries = Object.entries(map).map(([code, phone]) => ({ code, phone }));
  if (!entries.length) {
    return [
      { code: "GH", phone: "233500741699" },
      { code: "CM", phone: "" },
    ];
  }
  return entries.sort((a, b) => a.code.localeCompare(b.code));
}

function rowsToNumbers(rows: Row[]): WhatsAppCheckoutNumbers {
  const out: WhatsAppCheckoutNumbers = {};
  for (const row of rows) {
    const code = row.code.trim().toUpperCase();
    const phone = row.phone.replace(/\D/g, "");
    if (/^[A-Z]{2}$/.test(code) && phone.length >= 8) {
      out[code] = phone;
    }
  }
  return out;
}

export function WhatsAppCheckoutSettings({
  initialConfig,
}: {
  initialConfig: StoreConfigPayload;
}) {
  const [enabled, setEnabled] = useState(initialConfig.whatsappCheckoutEnabled);
  const [rows, setRows] = useState<Row[]>(() =>
    numbersToRows(initialConfig.whatsappCheckoutNumbers)
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const usedCodes = useMemo(() => new Set(rows.map((r) => r.code.toUpperCase())), [rows]);

  async function persist(next: {
    whatsappCheckoutEnabled?: boolean;
    whatsappCheckoutNumbers?: WhatsAppCheckoutNumbers;
  }) {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/store-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = (await res.json()) as StoreConfigPayload & { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save settings");
      setEnabled(data.whatsappCheckoutEnabled);
      setRows(numbersToRows(data.whatsappCheckoutNumbers));
      setMessage("WhatsApp checkout settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled() {
    const next = !enabled;
    await persist({
      whatsappCheckoutEnabled: next,
      // Persist visible rows when enabling so the storefront has numbers immediately.
      ...(next ? { whatsappCheckoutNumbers: rowsToNumbers(rows) } : {}),
    });
  }

  async function saveNumbers() {
    const map = rowsToNumbers(rows);
    if (!Object.keys(map).length) {
      setError("Add at least one country with a full international number (e.g. 233500741699).");
      return;
    }
    await persist({ whatsappCheckoutNumbers: map });
  }

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow(code = "") {
    setRows((prev) => [...prev, { code, phone: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="max-w-2xl space-y-6">
      <section className="border border-wf-border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-playfair text-xl mb-2">WhatsApp checkout</h2>
            <p className="text-sm text-wf-gray leading-relaxed">
              When enabled, shoppers in configured countries see an &quot;Order on
              WhatsApp&quot; button on product pages and at checkout. The number is
              chosen from their detected (or selected) country.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={saving}
            onClick={() => void toggleEnabled()}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
              enabled ? "bg-espresso" : "bg-wf-border"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        <p className="mt-4 text-sm">
          Status:{" "}
          <span className={enabled ? "text-green-700" : "text-wf-gray"}>
            {enabled ? "Enabled" : "Disabled"}
          </span>
        </p>
      </section>

      <section className="border border-wf-border bg-white p-6 space-y-4">
        <div>
          <h2 className="font-playfair text-xl mb-2">Country numbers</h2>
          <p className="text-sm text-wf-gray">
            Use international format without + (Ghana example:{" "}
            <span className="font-mono text-espresso">233500741699</span>).
          </p>
        </div>

        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={`${row.code}-${index}`} className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-wf-gray">Country</span>
                <input
                  value={row.code}
                  onChange={(e) =>
                    updateRow(index, { code: e.target.value.toUpperCase().slice(0, 2) })
                  }
                  placeholder="GH"
                  maxLength={2}
                  className="mt-1 w-16 border border-wf-border px-2 py-2 text-sm uppercase"
                />
              </label>
              <label className="block flex-1 min-w-[12rem]">
                <span className="text-xs uppercase tracking-wider text-wf-gray">
                  WhatsApp number
                </span>
                <input
                  value={row.phone}
                  onChange={(e) => updateRow(index, { phone: e.target.value })}
                  placeholder="233500741699"
                  className="mt-1 w-full border border-wf-border px-3 py-2 text-sm font-mono"
                />
              </label>
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="btn-outline !py-2 !px-3 text-xs"
                disabled={rows.length <= 1}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {SUGGESTED.filter((s) => !usedCodes.has(s.code)).slice(0, 4).map((s) => (
            <button
              key={s.code}
              type="button"
              onClick={() => addRow(s.code)}
              className="text-xs border border-wf-border px-2 py-1 hover:border-espresso"
            >
              + {s.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => addRow("")}
            className="text-xs border border-wf-border px-2 py-1 hover:border-espresso"
          >
            + Custom country
          </button>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => void saveNumbers()}
          className="btn-primary !py-2.5 !px-5 text-sm"
        >
          {saving ? "Saving…" : "Save numbers"}
        </button>

        {message ? <p className="text-sm text-green-700">{message}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </section>
    </div>
  );
}
