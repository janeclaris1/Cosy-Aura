import { stockCountryForShopper } from "@/lib/country-stock";
import { isRevenueOrder } from "@/lib/dashboard-analytics";

export type BranchReportBranch = {
  id: string;
  name: string;
  country: string;
  city: string | null;
  isDefault: boolean;
  createdAt: Date;
};

export type BranchReportOrder = {
  fulfillmentBranchId: string | null;
  shippingCountry: string | null;
  status: string;
  total: number;
  channel: string;
};

export type BranchReportRow = {
  branchId: string;
  name: string;
  country: string;
  city: string | null;
  /** Paid / completed sales (excludes pending, cancelled, refunded). */
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

export type BranchReportTotals = {
  transactions: number;
  revenue: number;
  posTransactions: number;
  posRevenue: number;
  webTransactions: number;
  webRevenue: number;
  stockUnits: number;
  toFulfil: number;
};

type BranchAgg = {
  transactions: number;
  revenue: number;
  posTransactions: number;
  posRevenue: number;
  webTransactions: number;
  webRevenue: number;
  toFulfil: number;
  delivered: number;
};

function emptyAgg(): BranchAgg {
  return {
    transactions: 0,
    revenue: 0,
    posTransactions: 0,
    posRevenue: 0,
    webTransactions: 0,
    webRevenue: 0,
    toFulfil: 0,
    delivered: 0,
  };
}

/** Default branch per managed country within the scoped branch list. */
export function buildDefaultBranchByCountry(
  branches: BranchReportBranch[]
): Map<string, string> {
  const byCountry = new Map<string, BranchReportBranch[]>();
  for (const branch of branches) {
    const list = byCountry.get(branch.country) || [];
    list.push(branch);
    byCountry.set(branch.country, list);
  }

  const result = new Map<string, string>();
  for (const [country, list] of byCountry) {
    const preferred =
      list.find((b) => b.isDefault) ||
      [...list].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    if (preferred) result.set(country, preferred.id);
  }
  return result;
}

/**
 * Attribute an order to a branch: explicit fulfilment branch, else default branch
 * for the shipping country when it falls in scope.
 */
export function resolveOrderBranchId(
  order: BranchReportOrder,
  branchIds: Set<string>,
  defaultByCountry: Map<string, string>
): string | null {
  if (order.fulfillmentBranchId && branchIds.has(order.fulfillmentBranchId)) {
    return order.fulfillmentBranchId;
  }

  const bucket = stockCountryForShopper(order.shippingCountry);
  if (!bucket) return null;

  const defaultId = defaultByCountry.get(bucket);
  if (defaultId && branchIds.has(defaultId)) return defaultId;

  return null;
}

export function aggregateBranchReportRows(
  branches: BranchReportBranch[],
  orders: BranchReportOrder[],
  stockByBranch: Map<string, number>,
  outByBranch: Map<string, { count: number; qty: number }>,
  inByBranch: Map<string, { count: number; qty: number }>
): { rows: BranchReportRow[]; totals: BranchReportTotals } {
  const branchIds = new Set(branches.map((b) => b.id));
  const defaultByCountry = buildDefaultBranchByCountry(branches);
  const agg = new Map<string, BranchAgg>();
  for (const id of branchIds) agg.set(id, emptyAgg());

  for (const order of orders) {
    if (order.status === "CANCELLED" || order.status === "REFUNDED") continue;

    const branchId = resolveOrderBranchId(order, branchIds, defaultByCountry);
    if (!branchId) continue;

    const bucket = agg.get(branchId)!;
    const isPos = order.channel === "POS";

    if (order.status === "PAID" || order.status === "PROCESSING") {
      bucket.toFulfil += 1;
    }
    if (order.status === "DELIVERED") {
      bucket.delivered += 1;
    }

    if (!isRevenueOrder(order.status)) continue;

    const total = Number(order.total || 0);
    bucket.transactions += 1;
    bucket.revenue += total;
    if (isPos) {
      bucket.posTransactions += 1;
      bucket.posRevenue += total;
    } else {
      bucket.webTransactions += 1;
      bucket.webRevenue += total;
    }
  }

  const rows = branches.map((branch) => {
    const stats = agg.get(branch.id)!;
    return {
      branchId: branch.id,
      name: branch.name,
      country: branch.country,
      city: branch.city,
      transactions: stats.transactions,
      revenue: roundGhs(stats.revenue),
      posTransactions: stats.posTransactions,
      posRevenue: roundGhs(stats.posRevenue),
      webTransactions: stats.webTransactions,
      webRevenue: roundGhs(stats.webRevenue),
      toFulfil: stats.toFulfil,
      delivered: stats.delivered,
      stockUnits: stockByBranch.get(branch.id) || 0,
      transfersOut: outByBranch.get(branch.id) || { count: 0, qty: 0 },
      transfersIn: inByBranch.get(branch.id) || { count: 0, qty: 0 },
    };
  });

  const totals: BranchReportTotals = {
    transactions: rows.reduce((n, r) => n + r.transactions, 0),
    revenue: roundGhs(rows.reduce((n, r) => n + r.revenue, 0)),
    posTransactions: rows.reduce((n, r) => n + r.posTransactions, 0),
    posRevenue: roundGhs(rows.reduce((n, r) => n + r.posRevenue, 0)),
    webTransactions: rows.reduce((n, r) => n + r.webTransactions, 0),
    webRevenue: roundGhs(rows.reduce((n, r) => n + r.webRevenue, 0)),
    stockUnits: rows.reduce((n, r) => n + r.stockUnits, 0),
    toFulfil: rows.reduce((n, r) => n + r.toFulfil, 0),
  };

  return { rows, totals };
}

function roundGhs(value: number): number {
  return Math.round(value * 100) / 100;
}
