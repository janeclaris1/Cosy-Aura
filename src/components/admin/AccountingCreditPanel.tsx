"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminTableWrap,
  adminInputClass,
  adminLabelClass,
  adminSelectClass,
  adminThClass,
  adminTheadClass,
} from "@/components/admin/admin-ui";
import { formatCreditDate } from "@/lib/credit-contract";
import { readAdminJson } from "@/lib/admin-fetch";

type CreditRow = {
  id: string;
  status: string;
  totalGhs: number;
  downPaymentGhs: number;
  balanceDueGhs: number;
  balancePaidGhs: number;
  balanceRemainingGhs: number;
  dueDate: string;
  order: {
    receiptNumber: string | null;
    shippingName: string | null;
    shippingPhone: string | null;
    fulfillmentBranch: { name: string } | null;
  };
};

function formatGhs(n: number) {
  return `GHS ${n.toFixed(2)}`;
}

export function AccountingCreditPanel() {
  const [rows, setRows] = useState<CreditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [payForm, setPayForm] = useState<{
    id: string;
    amount: string;
    method: string;
    reference: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await readAdminJson<{ agreements: CreditRow[] }>(
      await fetch("/api/admin/credit")
    );
    if (!res.ok) {
      setError(res.error);
      setRows([]);
    } else {
      setRows(res.data.agreements);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const processOverdue = async () => {
    setBusyId("overdue");
    const res = await fetch("/api/admin/credit/process-overdue", { method: "POST" });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "Could not process overdue agreements");
      return;
    }
    await load();
  };

  const submitPayment = async () => {
    if (!payForm) return;
    setBusyId(payForm.id);
    const res = await fetch(`/api/admin/credit/${payForm.id}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountGhs: Number(payForm.amount),
        paymentMethod: payForm.method,
        paymentReference: payForm.reference || undefined,
      }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "Payment failed");
      return;
    }
    setPayForm(null);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <AdminButton type="button" variant="secondary" onClick={() => void load()}>
          Refresh
        </AdminButton>
        <AdminButton
          type="button"
          variant="secondary"
          disabled={busyId === "overdue"}
          onClick={() => void processOverdue()}
        >
          {busyId === "overdue" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : null}
          Process overdue defaults
        </AdminButton>
      </div>

      {loading ? (
        <p className="text-sm text-mocha flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading credit agreements…
        </p>
      ) : error ? (
        <AdminEmptyState message={error} />
      ) : rows.length === 0 ? (
        <AdminEmptyState message="No customer credit agreements yet. Use POS → Credit (70% down). Goods release when the balance is paid in full." />
      ) : (
        <AdminTableWrap>
          <table className="w-full text-sm">
            <thead className={adminTheadClass}>
              <tr>
                <th className={adminThClass}>Customer</th>
                <th className={adminThClass}>Receipt</th>
                <th className={adminThClass}>Due</th>
                <th className={adminThClass}>Balance</th>
                <th className={adminThClass}>Status</th>
                <th className={adminThClass} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-stone-100">
                  <td className="py-3 px-4">
                    <p className="font-medium">{row.order.shippingName || "—"}</p>
                    <p className="text-xs text-mocha">{row.order.shippingPhone}</p>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">
                    {row.order.receiptNumber || "—"}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {formatCreditDate(new Date(row.dueDate))}
                  </td>
                  <td className="py-3 px-4 tabular-nums">
                    {formatGhs(row.balanceRemainingGhs)}
                    <span className="text-xs text-mocha block">
                      of {formatGhs(row.balanceDueGhs)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={
                        row.status === "ACTIVE"
                          ? "text-amber-800"
                          : row.status === "PAID"
                            ? "text-emerald-800"
                            : "text-red-800"
                      }
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {row.status === "ACTIVE" && row.balanceRemainingGhs > 0 && (
                      <AdminButton
                        type="button"
                        variant="secondary"
                        className="text-xs"
                        onClick={() =>
                          setPayForm({
                            id: row.id,
                            amount: String(row.balanceRemainingGhs),
                            method: "CASH",
                            reference: "",
                          })
                        }
                      >
                        Record payment
                      </AdminButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableWrap>
      )}

      {payForm && (
        <AdminCard>
          <h3 className="font-playfair text-lg text-[#03045e] mb-4">Record balance payment</h3>
          <p className="text-sm text-mocha mb-4">
            When the balance is paid in full, stock is deducted and goods are released to the
            customer.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 max-w-lg">
            <div>
              <label className={adminLabelClass}>Amount (GHS)</label>
              <input
                className={adminInputClass}
                type="number"
                min="0"
                step="0.01"
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
              />
            </div>
            <div>
              <label className={adminLabelClass}>Method</label>
              <select
                className={adminSelectClass}
                value={payForm.method}
                onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
              >
                <option value="CASH">Cash</option>
                <option value="MOMO">MoMo</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={adminLabelClass}>Reference (optional)</label>
              <input
                className={adminInputClass}
                value={payForm.reference}
                onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <AdminButton
              type="button"
              disabled={busyId === payForm.id}
              onClick={() => void submitPayment()}
            >
              {busyId === payForm.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Post payment
            </AdminButton>
            <AdminButton type="button" variant="secondary" onClick={() => setPayForm(null)}>
              Cancel
            </AdminButton>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
