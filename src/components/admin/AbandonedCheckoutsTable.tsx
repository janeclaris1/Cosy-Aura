import Link from "next/link";
import type { CheckoutAbandonmentItem } from "@/lib/checkout-abandonment";
import { formatOrderBookTotal } from "@/lib/order-money";
import { SendRecoveryEmailButton } from "@/components/admin/SendRecoveryEmailButton";
import {
  AdminEmptyState,
  AdminTableWrap,
  adminThClass,
  adminTheadClass,
} from "@/components/admin/admin-ui";

export type AbandonedCheckoutRow = {
  id: string;
  email: string;
  customerName: string | null;
  customerPhone: string | null;
  shippingCountry: string | null;
  checkoutProvider: string | null;
  subtotalGhs: number;
  displayCurrency: string | null;
  orderId: string | null;
  recoveryEmailedAt: Date | null;
  recoveryEmailCount: number;
  lastSeenAt: Date;
  createdAt: Date;
  items: unknown;
  order: { id: string; status: string } | null;
};

function formatWhen(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function itemsSummary(items: unknown): string {
  if (!Array.isArray(items)) return "—";
  const lines = items as CheckoutAbandonmentItem[];
  const count = lines.reduce((sum, line) => sum + (line.quantity || 0), 0);
  const first = lines[0];
  const label = first
    ? [first.brand, first.model].filter(Boolean).join(" ") || "Item"
    : "Item";
  if (lines.length === 1) {
    return count > 1 ? `${label} × ${count}` : label;
  }
  return `${label} + ${lines.length - 1} more (${count} items)`;
}

function stageLabel(row: AbandonedCheckoutRow): string {
  if (row.order?.status === "PENDING") return "At payment";
  return "Checkout started";
}

function providerLabel(provider: string | null): string {
  if (!provider) return "—";
  if (provider === "paystack") return "Paystack";
  if (provider === "flutterwave") return "Flutterwave";
  if (provider === "stripe") return "Stripe";
  return provider;
}

export function AbandonedCheckoutsTable({ rows }: { rows: AbandonedCheckoutRow[] }) {
  if (rows.length === 0) {
    return (
      <AdminTableWrap>
        <AdminEmptyState message="No abandoned checkouts in your scope." />
      </AdminTableWrap>
    );
  }

  return (
    <AdminTableWrap>
      <table className="w-full text-sm">
        <thead className={adminTheadClass}>
          <tr>
            <th className={adminThClass}>Customer</th>
            <th className={adminThClass}>Cart</th>
            <th className={adminThClass}>Value</th>
            <th className={adminThClass}>Stage</th>
            <th className={adminThClass}>Last seen</th>
            <th className={adminThClass}>Recovery</th>
            <th className={adminThClass}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-wf-border/60 last:border-0">
              <td className="px-4 py-3 align-top">
                <p className="font-medium text-espresso">
                  {row.customerName?.trim() || "—"}
                </p>
                <a
                  href={`mailto:${row.email}`}
                  className="text-[#03045e] hover:underline text-xs mt-0.5 inline-block"
                >
                  {row.email}
                </a>
                {row.customerPhone ? (
                  <p className="text-xs text-mocha mt-0.5">{row.customerPhone}</p>
                ) : null}
                <p className="text-[10px] text-mocha mt-1 uppercase tracking-wide">
                  {[row.shippingCountry, providerLabel(row.checkoutProvider)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </td>
              <td className="px-4 py-3 align-top text-mocha max-w-[14rem]">
                {itemsSummary(row.items)}
              </td>
              <td className="px-4 py-3 align-top tabular-nums font-semibold text-[#03045e]">
                {formatOrderBookTotal({ total: row.subtotalGhs })}
              </td>
              <td className="px-4 py-3 align-top">
                <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-900">
                  {stageLabel(row)}
                </span>
              </td>
              <td className="px-4 py-3 align-top text-xs text-mocha whitespace-nowrap">
                {formatWhen(row.lastSeenAt)}
              </td>
              <td className="px-4 py-3 align-top text-xs text-mocha">
                {row.recoveryEmailedAt ? (
                  <span>Sent {formatWhen(row.recoveryEmailedAt)}</span>
                ) : (
                  <span className="text-amber-800">Not sent</span>
                )}
              </td>
              <td className="px-4 py-3 align-top">
                <div className="flex flex-col gap-1 text-xs">
                  <SendRecoveryEmailButton
                    abandonmentId={row.id}
                    alreadySent={row.recoveryEmailCount > 0}
                  />
                  <a
                    href={`mailto:${row.email}?subject=${encodeURIComponent("Your COSY AURA checkout")}`}
                    className="text-[#03045e] hover:underline font-medium"
                  >
                    Manual email
                  </a>
                  {row.orderId ? (
                    <Link
                      href={`/admin/orders/${row.orderId}`}
                      className="text-[#03045e] hover:underline font-medium"
                    >
                      View order
                    </Link>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminTableWrap>
  );
}
