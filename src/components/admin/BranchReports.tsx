"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";

type Row = {
  branchId: string;
  name: string;
  country: string;
  city: string | null;
  orders: number;
  revenue: number;
  toFulfil: number;
  delivered: number;
  stockUnits: number;
  transfersOut: { count: number; qty: number };
  transfersIn: { count: number; qty: number };
};

type Totals = {
  orders: number;
  revenue: number;
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-mocha">
          {generatedAt
            ? `Updated ${new Date(generatedAt).toLocaleString()}`
            : "Branch roll-up"}
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/reports/export?kind=branches"
            className="border border-wf-border bg-white px-3 py-2 text-sm hover:bg-wf-light"
          >
            Export branches CSV
          </a>
          <a
            href="/api/admin/reports/export?kind=orders"
            className="border border-wf-border bg-white px-3 py-2 text-sm hover:bg-wf-light"
          >
            Export orders CSV
          </a>
          <button
            type="button"
            onClick={() => void load()}
            className="border border-wf-border bg-white px-3 py-2 text-sm hover:bg-wf-light"
          >
            Refresh
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {totals ? (
        <div className="grid sm:grid-cols-4 gap-3">
          <Stat label="Orders" value={String(totals.orders)} />
          <Stat label="Revenue" value={formatPrice(totals.revenue)} />
          <Stat label="To fulfil" value={String(totals.toFulfil)} />
          <Stat label="Stock units" value={String(totals.stockUnits)} />
        </div>
      ) : null}

      <div className="border border-wf-border bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="bg-wf-light">
            <tr>
              <th className="text-left p-3 font-medium">Branch</th>
              <th className="text-left p-3 font-medium">Orders</th>
              <th className="text-left p-3 font-medium">Revenue</th>
              <th className="text-left p-3 font-medium">To fulfil</th>
              <th className="text-left p-3 font-medium">Delivered</th>
              <th className="text-left p-3 font-medium">Stock</th>
              <th className="text-left p-3 font-medium">Transfers</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.branchId} className="border-t border-wf-border">
                <td className="p-3">
                  <span className="font-medium">{row.name}</span>
                  <span className="block text-xs text-mocha">
                    {row.country}
                    {row.city ? ` · ${row.city}` : ""}
                  </span>
                </td>
                <td className="p-3">{row.orders}</td>
                <td className="p-3">{formatPrice(row.revenue)}</td>
                <td className="p-3">{row.toFulfil}</td>
                <td className="p-3">{row.delivered}</td>
                <td className="p-3">{row.stockUnits}</td>
                <td className="p-3 text-xs text-mocha">
                  in {row.transfersIn.qty} · out {row.transfersOut.qty}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-mocha">
                  No branches in scope.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-wf-border bg-white p-4">
      <p className="text-xs text-mocha">{label}</p>
      <p className="font-playfair text-xl mt-1">{value}</p>
    </div>
  );
}
