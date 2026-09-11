export const REVENUE_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export type RevenueOrderStatus = (typeof REVENUE_STATUSES)[number];

export function isRevenueOrder(status: string): boolean {
  return REVENUE_STATUSES.includes(status as RevenueOrderStatus);
}

export type DashboardDailyPoint = {
  date: string;
  label: string;
  revenue: number;
  orders: number;
};

export type DashboardChannelPoint = {
  name: string;
  orders: number;
  revenue: number;
};

export type DashboardStatusPoint = {
  status: string;
  count: number;
};

export type DashboardChartData = {
  daily: DashboardDailyPoint[];
  channels: DashboardChannelPoint[];
  statuses: DashboardStatusPoint[];
  periodDays: number;
};

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shortLabel(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  const d = new Date(`${dateKey}T12:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function buildDashboardChartData(
  orders: {
    createdAt: Date;
    total: number;
    status: string;
    channel: string;
  }[],
  statusCounts: { status: string; count: number }[],
  periodDays = 30
): DashboardChartData {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const dailyMap = new Map<string, DashboardDailyPoint>();
  for (let i = periodDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = dayKey(d);
    dailyMap.set(key, {
      date: key,
      label: shortLabel(key),
      revenue: 0,
      orders: 0,
    });
  }

  const channelMap = new Map<string, { orders: number; revenue: number }>();
  for (const order of orders) {
    if (order.status === "CANCELLED" || order.status === "REFUNDED") continue;

    const key = dayKey(order.createdAt);
    const bucket = dailyMap.get(key);
    if (bucket) {
      bucket.orders += 1;
      if (REVENUE_STATUSES.includes(order.status as (typeof REVENUE_STATUSES)[number])) {
        bucket.revenue += Number(order.total || 0);
      }
    }

    const channelName = order.channel === "POS" ? "In-store (POS)" : "Online";
    const channel = channelMap.get(channelName) || { orders: 0, revenue: 0 };
    channel.orders += 1;
    if (REVENUE_STATUSES.includes(order.status as (typeof REVENUE_STATUSES)[number])) {
      channel.revenue += Number(order.total || 0);
    }
    channelMap.set(channelName, channel);
  }

  const daily = [...dailyMap.values()].map((row) => ({
    ...row,
    revenue: Math.round(row.revenue * 100) / 100,
  }));

  const channels: DashboardChannelPoint[] = [...channelMap.entries()]
    .map(([name, stats]) => ({
      name,
      orders: stats.orders,
      revenue: Math.round(stats.revenue * 100) / 100,
    }))
    .sort((a, b) => b.orders - a.orders);

  const statuses = statusCounts
    .filter((s) => s.count > 0 && s.status !== "CANCELLED")
    .sort((a, b) => b.count - a.count)
    .map((s) => ({ status: s.status, count: s.count }));

  return { daily, channels, statuses, periodDays };
}
