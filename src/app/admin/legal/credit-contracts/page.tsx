import Link from "next/link";
import { requireAdminPage, orderBranchWhere } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatCreditDate } from "@/lib/credit-contract";
import { creditBalanceRemaining, creditReceiptReady } from "@/lib/credit-agreement";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminTableWrap,
  adminPageWrap,
  adminTdClass,
  adminThClass,
  adminTheadClass,
} from "@/components/admin/admin-ui";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Filter = "pending" | "awaiting-payment" | "complete";

function contractStage(row: {
  contractApprovedAt: Date | null;
  downPaymentReceivedAt: Date | null;
  order: { status: string };
}): string {
  if (
    row.order.status === "REFUNDED" ||
    row.order.status === "CANCELLED"
  ) {
    return row.order.status;
  }
  if (creditReceiptReady(row)) return "Receipt ready";
  if (row.contractApprovedAt) return "Awaiting signature & payment";
  return "Generate contract";
}

export default async function LegalCreditContractsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const ctx = await requireAdminPage("legal.read");
  const branchScope = orderBranchWhere(ctx);
  const filterParam = searchParams.filter;
  const filter: Filter =
    filterParam === "awaiting-payment"
      ? "awaiting-payment"
      : filterParam === "complete"
        ? "complete"
        : "pending";

  const whereFilter =
    filter === "pending"
      ? { contractApprovedAt: null as Date | null }
      : filter === "awaiting-payment"
        ? { contractApprovedAt: { not: null }, downPaymentReceivedAt: null as Date | null }
        : { downPaymentReceivedAt: { not: null as Date | null } };

  const agreements = await prisma.creditAgreement.findMany({
    where: {
      ...whereFilter,
      order: branchScope ? (branchScope as object) : undefined,
    },
    orderBy: [{ createdAt: "desc" }],
    take: 100,
    include: {
      order: {
        select: {
          id: true,
          receiptNumber: true,
          shippingName: true,
          shippingPhone: true,
          status: true,
          createdAt: true,
          fulfillmentBranch: { select: { name: true } },
        },
      },
    },
  });

  const tabs: { id: Filter; label: string }[] = [
    { id: "pending", label: "Generate contract" },
    { id: "awaiting-payment", label: "Awaiting signature & payment" },
    { id: "complete", label: "Receipt ready" },
  ];

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Legal"
        title="Credit contracts"
        description="Credit sales from POS start here. Generate the contract, collect signature and 70% down payment, then print the receipt at POS."
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/admin/legal/credit-contracts?filter=${tab.id}`}
            className={`text-xs px-3 py-1.5 rounded-full ring-1 transition-colors ${
              filter === tab.id
                ? "bg-[#03045e] text-white ring-[#03045e]"
                : "bg-white text-mocha ring-stone-200 hover:ring-[#03045e]/30"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {agreements.length === 0 ? (
        <AdminEmptyState
          message={
            filter === "pending"
              ? "No new credit sales awaiting a contract. Submit a credit sale from POS to start."
              : filter === "awaiting-payment"
                ? "No contracts awaiting customer signature and down payment."
                : "No completed credit contracts yet."
          }
        />
      ) : (
        <AdminTableWrap>
          <table className="w-full text-sm">
            <thead className={adminTheadClass}>
              <tr>
                <th className={adminThClass}>Receipt</th>
                <th className={adminThClass}>Customer</th>
                <th className={adminThClass}>ID number</th>
                <th className={adminThClass}>70% / 30%</th>
                <th className={adminThClass}>Due</th>
                <th className={adminThClass}>Stage</th>
                <th className={adminThClass} />
              </tr>
            </thead>
            <tbody>
              {agreements.map((row) => {
                const remaining = creditBalanceRemaining(row);
                const paid = creditReceiptReady(row);
                return (
                  <tr key={row.id} className="border-t border-stone-100">
                    <td className={adminTdClass}>
                      <span className="font-mono text-xs">
                        {row.order.receiptNumber || row.order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <p className="text-xs text-mocha mt-0.5">
                        {row.order.fulfillmentBranch?.name}
                      </p>
                    </td>
                    <td className={adminTdClass}>
                      <p className="font-medium">{row.order.shippingName || "—"}</p>
                      {row.order.shippingPhone && (
                        <p className="text-xs text-mocha">{row.order.shippingPhone}</p>
                      )}
                    </td>
                    <td className={adminTdClass}>
                      <span className="font-mono text-xs">{row.customerIdNumber}</span>
                    </td>
                    <td className={adminTdClass}>
                      <p>{formatPrice(row.downPaymentGhs, "GHS")} down</p>
                      <p className="text-xs text-mocha">
                        {formatPrice(remaining, "GHS")} balance
                        {paid ? "" : " (not yet paid)"}
                      </p>
                    </td>
                    <td className={adminTdClass}>
                      {formatCreditDate(new Date(row.dueDate))}
                    </td>
                    <td className={adminTdClass}>
                      <span className="text-xs">{contractStage(row)}</span>
                    </td>
                    <td className={adminTdClass}>
                      <Link
                        href={`/admin/legal/credit-contracts/${row.order.id}`}
                        className="text-xs font-medium text-[#03045e] hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </AdminTableWrap>
      )}
    </div>
  );
}
