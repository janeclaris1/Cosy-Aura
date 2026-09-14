"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminEmptyState,
  adminInputClass,
  adminLabelClass,
  adminSelectClass,
} from "@/components/admin/admin-ui";
import { readAdminJson } from "@/lib/admin-fetch";
import { fragranceFamilyLabel } from "@/lib/utils";

type Rule = {
  id: string;
  fragranceFamily: string;
  ratePercent: number;
  active: boolean;
  country: string;
};

const COUNTRIES = [
  { id: "ALL", label: "All countries" },
  { id: "GH", label: "Ghana" },
  { id: "CM", label: "Cameroon" },
];

export function CommissionRulesManager() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [families, setFamilies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fragranceFamily: "ORIENTAL",
    ratePercent: "10",
    country: "ALL",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/hr/commission-rules");
      const result = await readAdminJson<{ rules: Rule[]; families: string[] }>(res);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRules(result.data.rules ?? []);
      setFamilies(result.data.families ?? []);
      const loadedFamilies = result.data.families ?? [];
      if (loadedFamilies.length) {
        setForm((f) =>
          loadedFamilies.includes(f.fragranceFamily)
            ? f
            : { ...f, fragranceFamily: loadedFamilies[0] }
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveRule(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/hr/commission-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fragranceFamily: form.fragranceFamily,
          ratePercent: Number(form.ratePercent),
          country: form.country,
          active: true,
        }),
      });
      const result = await readAdminJson(res);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRule(rule: Rule) {
    try {
      const res = await fetch("/api/admin/hr/commission-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, active: !rule.active }),
      });
      const result = await readAdminJson(res);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-mocha">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading commission rules…
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <AdminCard className="p-5">
        <h3 className="font-playfair text-lg text-[#03045e]">How it works</h3>
        <p className="mt-2 text-sm text-mocha leading-relaxed">
          When a sales staff member completes an in-store POS sale, they earn a
          percentage of each eligible line item (by scent family). Commission is
          tied to their HR employee record (staff ID / employee number). Staff
          without an employee profile will not earn commission until one is
          created. Credit sales earn commission when the order is fulfilled.
          Voided sales reverse commission. Earned commissions roll into the
          staff member&apos;s payslip bonus when you generate payroll.
        </p>
      </AdminCard>

      <AdminCard className="p-5">
        <h3 className="font-playfair text-lg text-[#03045e] mb-4">Add or update rule</h3>
        <form onSubmit={saveRule} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={adminLabelClass}>Scent family</label>
            <select
              className={adminSelectClass}
              value={form.fragranceFamily}
              onChange={(e) => setForm((f) => ({ ...f, fragranceFamily: e.target.value }))}
            >
              {families.map((f) => (
                <option key={f} value={f}>
                  {fragranceFamilyLabel(f)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={adminLabelClass}>Commission rate (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className={adminInputClass}
              value={form.ratePercent}
              onChange={(e) => setForm((f) => ({ ...f, ratePercent: e.target.value }))}
            />
          </div>
          <div>
            <label className={adminLabelClass}>Country</label>
            <select
              className={adminSelectClass}
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            >
              {COUNTRIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <AdminButton type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save rule
            </AdminButton>
          </div>
        </form>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </AdminCard>

      {rules.length === 0 ? (
        <AdminEmptyState message="No commission rules yet. Add a rule above — for example Oriental at 10% for Ghana POS sales." />
      ) : (
        <AdminCard className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/80 text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="px-4 py-3 font-medium">Family</th>
                <th className="px-4 py-3 font-medium">Rate</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-[#03045e]">
                    {fragranceFamilyLabel(rule.fragranceFamily)}
                  </td>
                  <td className="px-4 py-3">{rule.ratePercent}%</td>
                  <td className="px-4 py-3">{rule.country}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleRule(rule)}
                      className={
                        rule.active
                          ? "rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200/80"
                          : "rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 ring-1 ring-stone-200/80"
                      }
                    >
                      {rule.active ? "Active" : "Paused"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      )}
    </div>
  );
}
