"use client";

import { useEffect, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminSectionTitle,
  AdminTableWrap,
  adminTableClass,
  adminTdClass,
  adminThClass,
  adminTheadClass,
  adminTrClass,
} from "@/components/admin/admin-ui";
import { formatPrice } from "@/lib/utils";

type Row = {
  branchId: string;
  name: string;
  country: string;
  city: string | null;
  transactions: number;
  revenue: number;
  posTransactions: number;
  posRevenue: number;
  webTransactions: number;
  webRevenue: number;
  toFulfil: number;
  delivered: number;
  stockUnits: number;
  transfersOut: { count: number; qty: number };
  transfersIn: { count: number; qty: number };
};

type Totals = {
  transactions: number;
  revenue: number;
  posTransactions: number;
  posRevenue: number;
  webTransactions: number;
  webRevenue: number;
  stockUnits: number;
  toFulfil: number;
};

export function BranchReports() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch("/api/admin/reports");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not load reports");
      return;
    }
    setRows(data.rows || []);
    setTotals(data.totals || null);
    setGeneratedAt(data.generatedAt || null);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <AdminSectionTitle
        title="Branch reports"
        description="Paid POS and online transactions, fulfilment queue, and stock by branch."
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-mocha max-w-xl">
          {generatedAt ? `Updated ${new Date(generatedAt).toLocaleString()}.` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <AdminButton href="/api/admin/reports/export?kind=branches" variant="secondary">
            Export branches CSV
          </AdminButton>
          <AdminButton href="/api/admin/reports/export?kind=orders" variant="secondary">
            Export orders CSV
          </AdminButton>
          <AdminButton type="button" variant="secondary" onClick={() => void load()}>
            Refresh
          </AdminButton>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {totals ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Transactions" value={String(totals.transactions)} />
          <Stat label="Revenue" value={formatPrice(totals.revenue)} />
          <Stat
            label="In-store (POS)"
            value={`${totals.posTransactions} · ${formatPrice(totals.posRevenue)}`}
          />
          <Stat
            label="Online"
            value={`${totals.webTransactions} · ${formatPrice(totals.webRevenue)}`}
          />
        </div>
      ) : null}

      <AdminTableWrap>
        <table className={`${adminTableClass} min-w-[980px]`}>
          <thead className={adminTheadClass}>
            <tr>
              <th className={adminThClass}>Branch</th>
              <th className={adminThClass}>Transactions</th>
              <th className={adminThClass}>Revenue</th>
              <th className={adminThClass}>POS</th>
              <th className={adminThClass}>Online</th>
              <th className={adminThClass}>To fulfil</th>
              <th className={adminThClass}>Delivered</th>
              <th className={adminThClass}>Stock</th>
              <th className={adminThClass}>Transfers</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.branchId} className={adminTrClass}>
                <td className={adminTdClass}>
                  <span className="font-medium">{row.name}</span>
                  <span className="block text-xs text-mocha">
                    {row.country}
                    {row.city ? ` · ${row.city}` : ""}
                  </span>
                </td>
                <td className={adminTdClass}>{row.transactions}</td>
                <td className={adminTdClass}>{formatPrice(row.revenue)}</td>
                <td className={`${adminTdClass} text-xs`}>
                  <span className="block">{row.posTransactions} sales</span>
                  <span className="text-mocha">{formatPrice(row.posRevenue)}</span>
                </td>
                <td className={`${adminTdClass} text-xs`}>
                  <span className="block">{row.webTransactions} sales</span>
                  <span className="text-mocha">{formatPrice(row.webRevenue)}</span>
                </td>
                <td className={adminTdClass}>{row.toFulfil}</td>
                <td className={adminTdClass}>{row.delivered}</td>
                <td className={adminTdClass}>{row.stockUnits}</td>
                <td className={`${adminTdClass} text-xs text-mocha`}>
                  in {row.transfersIn.qty} · out {row.transfersOut.qty}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={9} className={`${adminTdClass} text-center text-mocha`}>
                  No branches in scope.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </AdminTableWrap>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <AdminCard>
      <p className="text-xs text-mocha">{label}</p>
      <p className="font-playfair text-xl mt-1 text-[#03045e]">{value}</p>
    </AdminCard>
  );
}
