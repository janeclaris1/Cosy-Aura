import { isRevenueOrder } from "@/lib/dashboard-analytics";
import {
  buildDefaultBranchByCountry,
  resolveOrderBranchId,
  type BranchReportBranch,
} from "@/lib/branch-reports";
import {
  extractGhanaPosTaxBreakdown,
  type GhanaPosTaxBreakdown,
} from "@/lib/pos-taxes";

export type TaxReportOrder = {
  id: string;
  createdAt: Date;
  status: string;
  channel: string;
  total: number;
  shippingCost: number | null;
  posDiscountAmount: number | null;
  fulfillmentBranchId: string | null;
  shippingCountry: string | null;
  items: { price: number; quantity: number }[];
};

export type TaxReportTotals = GhanaPosTaxBreakdown & {
  orders: number;
  grossSales: number;
  posOrders: number;
  webOrders: number;
};

export type TaxReportBranchRow = {
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

export type TaxReportDailyRow = {
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

type TaxBucket = GhanaPosTaxBreakdown & {
  orders: number;
  grossSales: number;
  posOrders: number;
  webOrders: number;
};

function emptyBucket(): TaxBucket {
  return {
    orders: 0,
    grossSales: 0,
    posOrders: 0,
    webOrders: 0,
    taxable: 0,
    nhil: 0,
    getfund: 0,
    vat: 0,
    total: 0,
  };
}

function roundGhs(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Tax-inclusive product value used for GRA levy extraction. */
export function orderTaxableAmount(order: TaxReportOrder): number {
  if (order.channel === "POS") {
    const subtotal = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const discount = Number(order.posDiscountAmount || 0);
    return Math.max(0, subtotal - discount);
  }

  const shipping = Number(order.shippingCost || 0);
  return Math.max(0, Number(order.total || 0) - shipping);
}

/** Inclusive start, exclusive end — local calendar month from `YYYY-MM`. */
export function monthRangeForFilter(month: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [year, monthIndex] = month.split("-").map(Number);
  if (monthIndex < 1 || monthIndex > 12) return null;

  return {
    start: new Date(year, monthIndex - 1, 1, 0, 0, 0, 0),
    end: new Date(year, monthIndex, 1, 0, 0, 0, 0),
  };
}

function addToBucket(bucket: TaxBucket, gross: number, taxes: GhanaPosTaxBreakdown, isPos: boolean) {
  bucket.orders += 1;
  bucket.grossSales = roundGhs(bucket.grossSales + gross);
  if (isPos) bucket.posOrders += 1;
  else bucket.webOrders += 1;
  bucket.taxable = roundGhs(bucket.taxable + taxes.taxable);
  bucket.nhil = roundGhs(bucket.nhil + taxes.nhil);
  bucket.getfund = roundGhs(bucket.getfund + taxes.getfund);
  bucket.vat = roundGhs(bucket.vat + taxes.vat);
  bucket.total = roundGhs(bucket.total + taxes.total);
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dayLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(d);
}

export function aggregateTaxReport(
  orders: TaxReportOrder[],
  branches: BranchReportBranch[]
): {
  totals: TaxReportTotals;
  byBranch: TaxReportBranchRow[];
  byDay: TaxReportDailyRow[];
} {
  const branchIds = new Set(branches.map((b) => b.id));
  const defaultByCountry = buildDefaultBranchByCountry(branches);
  const branchAgg = new Map<string, TaxBucket>();
  const dayAgg = new Map<string, TaxBucket>();
  const totals = emptyBucket();

  for (const id of branchIds) branchAgg.set(id, emptyBucket());

  for (const order of orders) {
    if (!isRevenueOrder(order.status)) continue;

    const gross = orderTaxableAmount(order);
    if (gross <= 0) continue;

    const taxes = extractGhanaPosTaxBreakdown(gross);
    const isPos = order.channel === "POS";

    addToBucket(totals, gross, taxes, isPos);

    const key = dayKey(order.createdAt);
    const dayBucket = dayAgg.get(key) || emptyBucket();
    addToBucket(dayBucket, gross, taxes, isPos);
    dayAgg.set(key, dayBucket);

    const branchId = resolveOrderBranchId(order, branchIds, defaultByCountry);
    if (branchId) {
      const branchBucket = branchAgg.get(branchId)!;
      addToBucket(branchBucket, gross, taxes, isPos);
    }
  }

  const byBranch = branches
    .map((branch) => {
      const stats = branchAgg.get(branch.id)!;
      return {
        branchId: branch.id,
        name: branch.name,
        country: branch.country,
        orders: stats.orders,
        grossSales: stats.grossSales,
        taxable: stats.taxable,
        nhil: stats.nhil,
        getfund: stats.getfund,
        vat: stats.vat,
        total: stats.total,
      };
    })
    .filter((row) => row.orders > 0);

  const byDay = [...dayAgg.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({
      date,
      label: dayLabel(date),
      orders: stats.orders,
      grossSales: stats.grossSales,
      taxable: stats.taxable,
      nhil: stats.nhil,
      getfund: stats.getfund,
      vat: stats.vat,
      total: stats.total,
    }));

  return { totals, byBranch, byDay };
}

export function formatTaxMonthLabel(monthKey: string): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}
