"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminSectionTitle,
  AdminTableWrap,
  adminInputClass,
  adminLabelClass,
  adminTableClass,
  adminTdClass,
  adminThClass,
  adminTheadClass,
  adminTrClass,
} from "@/components/admin/admin-ui";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

type TaxTotals = {
  orders: number;
  grossSales: number;
  posOrders: number;
  webOrders: number;
  taxable: number;
  nhil: number;
  getfund: number;
  vat: number;
  total: number;
};

type BranchRow = {
  branchId: string;
  name: string;
  country: string;
  orders: number;
  grossSales: number;
  taxable: number;
  nhil: number;
  getfund: number;
  vat: number;
  total: number;
};

type DailyRow = {
  date: string;
  label: string;
  orders: number;
  grossSales: number;
  taxable: number;
  nhil: number;
  getfund: number;
  vat: number;
  total: number;
};

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function TaxReport() {
  const [month, setMonth] = useState(currentMonthKey);
  const [totals, setTotals] = useState<TaxTotals | null>(null);
  const [byBranch, setByBranch] = useState<BranchRow[]>([]);
  const [byDay, setByDay] = useState<DailyRow[]>([]);
  const [monthLabel, setMonthLabel] = useState("");
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/taxes?month=${encodeURIComponent(month)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not load tax report");
        return;
      }
      setTotals(data.totals || null);
      setByBranch(data.byBranch || []);
      setByDay(data.byDay || []);
      setMonthLabel(data.monthLabel || month);
      setGeneratedAt(data.generatedAt || null);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportHref = `/api/admin/reports/export?kind=taxes&month=${encodeURIComponent(month)}`;

  return (
    <div className="space-y-4">
      <AdminSectionTitle
        title="Tax report"
        description="NHIL, GETFund and VAT extracted from tax-inclusive sales (GRA standard). Voided, refunded and unpaid orders are excluded."
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="block min-w-[12rem]">
          <span className={adminLabelClass}>Month</span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className={cn(adminInputClass, "rounded-xl")}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <AdminButton
            type="button"
            variant="secondary"
            onClick={() => void load()}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </AdminButton>
          <AdminButton href={exportHref} variant="secondary" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </AdminButton>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {generatedAt ? (
        <p className="text-sm text-mocha">
          {monthLabel} · Updated {new Date(generatedAt).toLocaleString()}
        </p>
      ) : null}

      {totals ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat
              label="Paid orders"
              value={String(totals.orders)}
              hint={`${totals.posOrders} POS · ${totals.webOrders} online`}
            />
            <Stat label="Gross sales (incl.)" value={formatPrice(totals.grossSales)} />
            <Stat label="Taxable value (excl.)" value={formatPrice(totals.taxable)} />
            <Stat label="Total tax" value={formatPrice(totals.total)} accent />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <Stat label="NHIL (2.5%)" value={formatPrice(totals.nhil)} />
            <Stat label="GETFund (2.5%)" value={formatPrice(totals.getfund)} />
            <Stat label="VAT (15%)" value={formatPrice(totals.vat)} />
          </div>

          <AdminTableWrap>
            <table className={adminTableClass}>
              <thead className={adminTheadClass}>
                <tr>
                  <th className={adminThClass}>Day</th>
                  <th className={adminThClass}>Orders</th>
                  <th className={adminThClass}>Gross sales</th>
                  <th className={adminThClass}>Taxable</th>
                  <th className={adminThClass}>NHIL</th>
                  <th className={adminThClass}>GETFund</th>
                  <th className={adminThClass}>VAT</th>
                  <th className={adminThClass}>Total tax</th>
                </tr>
              </thead>
              <tbody>
                {byDay.map((row) => (
                  <tr key={row.date} className={adminTrClass}>
                    <td className={adminTdClass}>{row.label}</td>
                    <td className={adminTdClass}>{row.orders}</td>
                    <td className={adminTdClass}>{formatPrice(row.grossSales)}</td>
                    <td className={adminTdClass}>{formatPrice(row.taxable)}</td>
                    <td className={adminTdClass}>{formatPrice(row.nhil)}</td>
                    <td className={adminTdClass}>{formatPrice(row.getfund)}</td>
                    <td className={adminTdClass}>{formatPrice(row.vat)}</td>
                    <td className={`${adminTdClass} font-medium`}>
                      {formatPrice(row.total)}
                    </td>
                  </tr>
                ))}
                {!byDay.length ? (
                  <tr>
                    <td colSpan={8} className={`${adminTdClass} text-center text-mocha`}>
                      No paid sales in this month.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </AdminTableWrap>

          {byBranch.length ? (
            <AdminTableWrap>
              <p className="px-4 pt-4 text-xs font-medium uppercase tracking-[0.12em] text-mocha">
                By branch
              </p>
              <table className={adminTableClass}>
                <thead className={adminTheadClass}>
                  <tr>
                    <th className={adminThClass}>Branch</th>
                    <th className={adminThClass}>Orders</th>
                    <th className={adminThClass}>Gross sales</th>
                    <th className={adminThClass}>Total tax</th>
                  </tr>
                </thead>
                <tbody>
                  {byBranch.map((row) => (
                    <tr key={row.branchId} className={adminTrClass}>
                      <td className={adminTdClass}>
                        <span className="font-medium">{row.name}</span>
                        <span className="block text-xs text-mocha">{row.country}</span>
                      </td>
                      <td className={adminTdClass}>{row.orders}</td>
                      <td className={adminTdClass}>{formatPrice(row.grossSales)}</td>
                      <td className={`${adminTdClass} font-medium`}>
                        {formatPrice(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableWrap>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <AdminCard>
      <p className="text-xs text-mocha">{label}</p>
      <p
        className={cn(
          "font-playfair text-xl mt-1",
          accent ? "text-[#c8102e]" : "text-[#03045e]"
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-[11px] text-mocha mt-1">{hint}</p> : null}
    </AdminCard>
  );
}
