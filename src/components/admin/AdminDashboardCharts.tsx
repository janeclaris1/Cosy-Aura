"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  DashboardChannelPoint,
  DashboardDailyPoint,
  DashboardStatusPoint,
} from "@/lib/dashboard-analytics";

const NAVY = "#03045e";
const GOLD = "#c9a227";
const STONE = "#78716c";
const CHANNEL_COLORS = [NAVY, "#4a6fa5", "#8b7355"];

function formatGhs(value: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatGhsFull(value: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

type Props = {
  daily: DashboardDailyPoint[];
  channels: DashboardChannelPoint[];
  statuses: DashboardStatusPoint[];
  periodDays: number;
};

export function AdminDashboardCharts({
  daily,
  channels,
  statuses,
  periodDays,
}: Props) {
  const hasDaily = daily.some((d) => d.orders > 0 || d.revenue > 0);
  const hasChannels = channels.some((c) => c.orders > 0);
  const hasStatuses = statuses.length > 0;

  return (
    <section className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white shadow-sm ring-1 ring-black/[0.04] px-5 py-5">
        <div className="mb-5">
          <h2 className="font-playfair text-lg text-[#03045e]">Sales trend</h2>
          <p className="text-xs text-mocha mt-0.5">
            Revenue and order volume — last {periodDays} days
          </p>
        </div>
        {hasDaily ? (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={daily}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: STONE, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e7e5e4" }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  yAxisId="revenue"
                  tick={{ fill: STONE, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatGhs(Number(v))}
                  width={72}
                />
                <YAxis
                  yAxisId="orders"
                  orientation="right"
                  tick={{ fill: STONE, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={32}
                />
                <Tooltip content={<DailyTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: STONE, paddingBottom: 12 }}
                />
                <Bar
                  yAxisId="revenue"
                  dataKey="revenue"
                  name="Revenue"
                  fill={NAVY}
                  fillOpacity={0.85}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={28}
                />
                <Line
                  yAxisId="orders"
                  type="monotone"
                  dataKey="orders"
                  name="Orders"
                  stroke={GOLD}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: GOLD, stroke: "#fff", strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="No sales in this period yet." />
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-white shadow-sm ring-1 ring-black/[0.04] px-5 py-5">
          <div className="mb-4">
            <h2 className="font-playfair text-lg text-[#03045e]">Channel mix</h2>
            <p className="text-xs text-mocha mt-0.5">Online vs in-store</p>
          </div>
          {hasChannels ? (
            <>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channels}
                      dataKey="orders"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {channels.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChannelTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 space-y-2">
                {channels.map((row, index) => (
                  <li
                    key={row.name}
                    className="flex items-center justify-between text-xs text-mocha"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            CHANNEL_COLORS[index % CHANNEL_COLORS.length],
                        }}
                      />
                      {row.name}
                    </span>
                    <span className="tabular-nums text-espresso font-medium">
                      {row.orders} · {formatGhsFull(row.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EmptyChart message="No channel data yet." compact />
          )}
        </div>

        <div className="bg-white shadow-sm ring-1 ring-black/[0.04] px-5 py-5">
          <div className="mb-4">
            <h2 className="font-playfair text-lg text-[#03045e]">By status</h2>
            <p className="text-xs text-mocha mt-0.5">Active orders in scope</p>
          </div>
          {hasStatuses ? (
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statuses}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke="#e7e5e4" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: STONE, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="status"
                    tick={{ fill: STONE, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={72}
                    tickFormatter={statusLabel}
                  />
                  <Tooltip content={<StatusTooltip />} cursor={{ fill: "#fafafa" }} />
                  <Bar dataKey="count" fill={NAVY} fillOpacity={0.75} radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No orders to chart." compact />
          )}
        </div>
      </div>
    </section>
  );
}

function EmptyChart({
  message,
  compact,
}: {
  message: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-center text-sm text-mocha bg-[#fafafa] ring-1 ring-stone-100 ${
        compact ? "h-[120px]" : "h-[280px]"
      }`}
    >
      {message}
    </div>
  );
}

function DailyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; dataKey: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const revenue = payload.find((p) => p.dataKey === "revenue")?.value ?? 0;
  const orders = payload.find((p) => p.dataKey === "orders")?.value ?? 0;
  return (
    <div className="bg-white px-3 py-2 shadow-md ring-1 ring-black/[0.06] text-xs">
      <p className="font-medium text-espresso mb-1">{label}</p>
      <p className="text-mocha">
        Revenue: <span className="text-[#03045e] font-medium">{formatGhsFull(revenue)}</span>
      </p>
      <p className="text-mocha">
        Orders: <span className="text-[#03045e] font-medium">{orders}</span>
      </p>
    </div>
  );
}

function ChannelTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; payload: DashboardChannelPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-white px-3 py-2 shadow-md ring-1 ring-black/[0.06] text-xs">
      <p className="font-medium text-espresso mb-1">{row.name}</p>
      <p className="text-mocha">
        {row.orders} orders · {formatGhsFull(row.revenue)}
      </p>
    </div>
  );
}

function StatusTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DashboardStatusPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-white px-3 py-2 shadow-md ring-1 ring-black/[0.06] text-xs">
      <p className="font-medium text-espresso">{statusLabel(row.status)}</p>
      <p className="text-mocha">{row.count} orders</p>
    </div>
  );
}
