"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminTableActions,
  AdminTableWrap,
  adminInputClass,
  adminLabelClass,
  adminSelectClass,
  adminTableClass,
  adminTdClass,
  adminThClass,
  adminTheadClass,
  adminTrClass,
} from "@/components/admin/admin-ui";
import { readAdminJson } from "@/lib/admin-fetch";
import { cn, formatPrice } from "@/lib/utils";

type DebtRow = {
  id: string;
  lender: string;
  description: string | null;
  debtType: string;
  glAccountCode: string;
  principalGhs: number;
  balanceGhs: number;
  interestRatePct: number | null;
  startDate: string;
  maturityDate: string | null;
  status: string;
};

const DEBT_TYPES = [
  { value: "BANK_LOAN", label: "Bank loan" },
  { value: "SUPPLIER", label: "Supplier credit" },
  { value: "OTHER", label: "Other" },
];

const LIABILITY_OPTIONS = [
  { value: "2200", label: "2200 · Long-term loan" },
  { value: "2210", label: "2210 · Short-term loan" },
];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AccountingDebtsPanel() {
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [totalOwed, setTotalOwed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [payDebtId, setPayDebtId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    lender: "",
    description: "",
    debtType: "BANK_LOAN",
    glAccountCode: "2200",
    principalGhs: "",
    interestRatePct: "",
    startDate: new Date().toISOString().slice(0, 10),
    maturityDate: "",
    recordDraw: true,
    paidTo: "BANK",
    notes: "",
  });

  const [payForm, setPayForm] = useState({
    principalGhs: "",
    interestGhs: "",
    paidFrom: "BANK",
    paymentDate: new Date().toISOString().slice(0, 10),
    memo: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await readAdminJson<{ debts: DebtRow[]; totalOwed: number }>(
      await fetch("/api/admin/accounting/debts")
    );
    if (!res.ok) {
      setError(res.error);
      setDebts([]);
    } else {
      setDebts(res.data.debts);
      setTotalOwed(res.data.totalOwed);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitDebt(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await readAdminJson(
      await fetch("/api/admin/accounting/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          principalGhs: Number(form.principalGhs),
          interestRatePct: form.interestRatePct ? Number(form.interestRatePct) : null,
          maturityDate: form.maturityDate || null,
        }),
      })
    );
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setShowForm(false);
    setForm((f) => ({ ...f, lender: "", description: "", principalGhs: "", notes: "" }));
    void load();
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payDebtId) return;
    setSubmitting(true);
    setError("");
    const res = await readAdminJson(
      await fetch(`/api/admin/accounting/debts/${payDebtId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payForm,
          principalGhs: Number(payForm.principalGhs || 0),
          interestGhs: Number(payForm.interestGhs || 0),
        }),
      })
    );
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPayDebtId(null);
    setPayForm({
      principalGhs: "",
      interestGhs: "",
      paidFrom: "BANK",
      paymentDate: new Date().toISOString().slice(0, 10),
      memo: "",
    });
    void load();
  }

  const activeDebts = debts.filter((d) => d.status === "ACTIVE");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminCard className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-mocha">Active debts</p>
          <p className="text-xl font-semibold text-[#03045e] mt-1">{activeDebts.length}</p>
        </AdminCard>
        <AdminCard className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-mocha">Total owed</p>
          <p className="text-xl font-semibold text-rose-800 mt-1">
            {formatPrice(totalOwed, "GHS")}
          </p>
        </AdminCard>
        <AdminCard className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-mocha">Due in 90 days</p>
          <p className="text-xl font-semibold text-amber-800 mt-1">
            {
              activeDebts.filter((d) => {
                if (!d.maturityDate) return false;
                const days =
                  (new Date(d.maturityDate).getTime() - Date.now()) / (86400000);
                return days >= 0 && days <= 90;
              }).length
            }
          </p>
        </AdminCard>
      </div>

      <div className="flex flex-wrap gap-2">
        <AdminButton type="button" onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-4 h-4" />
          Register debt
        </AdminButton>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {showForm ? (
        <AdminCard>
          <form onSubmit={submitDebt} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={adminLabelClass}>Lender</label>
              <input
                className={adminInputClass}
                value={form.lender}
                onChange={(e) => setForm({ ...form, lender: e.target.value })}
                required
              />
            </div>
            <div>
              <label className={adminLabelClass}>Type</label>
              <select
                className={adminSelectClass}
                value={form.debtType}
                onChange={(e) => setForm({ ...form, debtType: e.target.value })}
              >
                {DEBT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={adminLabelClass}>Principal (GHS)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={adminInputClass}
                value={form.principalGhs}
                onChange={(e) => setForm({ ...form, principalGhs: e.target.value })}
                required
              />
            </div>
            <div>
              <label className={adminLabelClass}>Interest rate (% p.a.)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={adminInputClass}
                value={form.interestRatePct}
                onChange={(e) => setForm({ ...form, interestRatePct: e.target.value })}
              />
            </div>
            <div>
              <label className={adminLabelClass}>Liability account</label>
              <select
                className={adminSelectClass}
                value={form.glAccountCode}
                onChange={(e) => setForm({ ...form, glAccountCode: e.target.value })}
              >
                {LIABILITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={adminLabelClass}>Start date</label>
              <input
                type="date"
                className={adminInputClass}
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className={adminLabelClass}>Maturity date</label>
              <input
                type="date"
                className={adminInputClass}
                value={form.maturityDate}
                onChange={(e) => setForm({ ...form, maturityDate: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={adminLabelClass}>Description</label>
              <input
                className={adminInputClass}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <label className="sm:col-span-2 flex items-center gap-2 text-sm text-mocha">
              <input
                type="checkbox"
                checked={form.recordDraw}
                onChange={(e) => setForm({ ...form, recordDraw: e.target.checked })}
              />
              Post loan draw to ledger (DR Bank/MoMo/Cash, CR loan payable)
            </label>
            {form.recordDraw ? (
              <div>
                <label className={adminLabelClass}>Funds received into</label>
                <select
                  className={adminSelectClass}
                  value={form.paidTo}
                  onChange={(e) => setForm({ ...form, paidTo: e.target.value })}
                >
                  <option value="BANK">Bank</option>
                  <option value="MOMO">Mobile money</option>
                  <option value="CASH">Petty cash</option>
                </select>
              </div>
            ) : null}
            <div className="sm:col-span-2 flex gap-2">
              <AdminButton type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save debt"}
              </AdminButton>
              <AdminButton type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </AdminButton>
            </div>
          </form>
        </AdminCard>
      ) : null}

      {payDebtId ? (
        <AdminCard>
          <h3 className="font-playfair text-lg text-[#03045e] mb-4">Record repayment</h3>
          <form onSubmit={submitPayment} className="grid gap-4 sm:grid-cols-2 max-w-xl">
            <div>
              <label className={adminLabelClass}>Principal (GHS)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={adminInputClass}
                value={payForm.principalGhs}
                onChange={(e) => setPayForm({ ...payForm, principalGhs: e.target.value })}
              />
            </div>
            <div>
              <label className={adminLabelClass}>Interest (GHS)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={adminInputClass}
                value={payForm.interestGhs}
                onChange={(e) => setPayForm({ ...payForm, interestGhs: e.target.value })}
              />
            </div>
            <div>
              <label className={adminLabelClass}>Paid from</label>
              <select
                className={adminSelectClass}
                value={payForm.paidFrom}
                onChange={(e) => setPayForm({ ...payForm, paidFrom: e.target.value })}
              >
                <option value="BANK">Bank</option>
                <option value="MOMO">Mobile money</option>
                <option value="CASH">Petty cash</option>
              </select>
            </div>
            <div>
              <label className={adminLabelClass}>Payment date</label>
              <input
                type="date"
                className={adminInputClass}
                value={payForm.paymentDate}
                onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <AdminButton type="submit" disabled={submitting}>
                {submitting ? "Posting…" : "Post payment"}
              </AdminButton>
              <AdminButton type="button" variant="secondary" onClick={() => setPayDebtId(null)}>
                Cancel
              </AdminButton>
            </div>
          </form>
        </AdminCard>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-mocha py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading debts…
        </div>
      ) : !debts.length ? (
        <AdminEmptyState message="No debts registered yet." />
      ) : (
        <AdminTableWrap>
          <table className={adminTableClass}>
            <thead className={adminTheadClass}>
              <tr>
                <th className={adminThClass}>Lender</th>
                <th className={adminThClass}>Balance</th>
                <th className={adminThClass}>Rate</th>
                <th className={adminThClass}>Maturity</th>
                <th className={adminThClass}>Status</th>
                <th className={adminThClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {debts.map((debt) => (
                <tr key={debt.id} className={adminTrClass}>
                  <td className={adminTdClass}>
                    <p className="font-medium text-espresso">{debt.lender}</p>
                    <p className="text-xs text-mocha">{debt.glAccountCode}</p>
                  </td>
                  <td className={adminTdClass}>
                    <span className="tabular-nums font-semibold text-[#03045e]">
                      {formatPrice(debt.balanceGhs, "GHS")}
                    </span>
                    <span className="text-xs text-mocha block">
                      of {formatPrice(debt.principalGhs, "GHS")}
                    </span>
                  </td>
                  <td className={adminTdClass}>
                    {debt.interestRatePct != null ? `${debt.interestRatePct}%` : "—"}
                  </td>
                  <td className={adminTdClass}>{formatDate(debt.maturityDate)}</td>
                  <td className={adminTdClass}>
                    <span
                      className={cn(
                        "text-xs font-medium uppercase tracking-wide",
                        debt.status === "ACTIVE"
                          ? "text-amber-800"
                          : debt.status === "PAID_OFF"
                            ? "text-emerald-700"
                            : "text-red-700"
                      )}
                    >
                      {debt.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className={adminTdClass}>
                    {debt.status === "ACTIVE" ? (
                      <AdminTableActions>
                        <button
                          type="button"
                          className="text-sm font-medium text-[#03045e] hover:underline"
                          onClick={() => setPayDebtId(debt.id)}
                        >
                          Pay
                        </button>
                      </AdminTableActions>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableWrap>
      )}
    </div>
  );
}
