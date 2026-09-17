import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-page";
import { orderBranchWhere } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { AdminButton, AdminLink } from "@/components/admin/admin-ui";
import { PosReceiptPrintButton } from "@/components/admin/PosReceiptPrintButton";
import { PosReceiptAutoPrint } from "@/components/admin/PosReceiptAutoPrint";
import { PosReceiptQr } from "@/components/admin/PosReceiptQr";
import { PosTaxSummary } from "@/components/admin/PosTaxSummary";
import { formatPosDiscountLabel } from "@/lib/pos-discount";
import { buildReceiptTaxBreakdown } from "@/lib/pos-taxes";
import { siteUrl } from "@/lib/seo";
import { creditBalanceRemaining, creditReceiptReady } from "@/lib/credit-agreement";

function paymentLabel(method: string | null) {
  switch (method) {
    case "CASH":
      return "Cash";
    case "MOMO":
      return "Mobile money";
    case "CARD":
      return "Card";
    case "OTHER":
      return "Other";
    case "CREDIT":
      return "Credit (70% down / 30% balance)";
    default:
      return "—";
  }
}

export default async function PosReceiptPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await requireAdminPage("pos.read");

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          fragrance: { include: { brand: true } },
        },
      },
      fulfillmentBranch: true,
      posUser: { select: { name: true, email: true } },
      commissionEmployee: {
        select: {
          employeeNumber: true,
          user: { select: { name: true, email: true } },
        },
      },
      creditAgreement: true,
    },
  });

  if (!order || order.channel !== "POS") notFound();

  const scope = orderBranchWhere(ctx);
  if (scope) {
    const allowed = await prisma.order.findFirst({
      where: { id: order.id, ...(scope as object) },
      select: { id: true },
    });
    if (!allowed) notFound();
  }

  const branch = order.fulfillmentBranch;
  const receiptNo = order.receiptNumber || order.id.slice(0, 8).toUpperCase();
  const qrValue = `${siteUrl()}/contact?receipt=${encodeURIComponent(receiptNo)}`;
  const voided =
    order.status === "REFUNDED" || order.status === "CANCELLED";
  const itemsSubtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const discountAmount = Number(order.posDiscountAmount || 0);
  const inclusiveTotal = Math.max(0, itemsSubtotal - discountAmount);
  const receiptTax = buildReceiptTaxBreakdown(inclusiveTotal, order.shippingCountry);
  const credit = order.creditAgreement;
  const creditRemaining = credit ? creditBalanceRemaining(credit) : 0;
  const receiptLocked = credit && !creditReceiptReady(credit);

  return (
    <div className="pos-receipt-print-root max-w-sm mx-auto p-4 print:p-0 print:max-w-none">
      {!voided && !receiptLocked && <PosReceiptAutoPrint />}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 mb-4">
        <AdminButton
          href="/admin/pos"
          variant="secondary"
          className="!rounded-xl !px-3.5 !py-2 text-xs shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
          Back to POS
        </AdminButton>
        <div className="flex flex-wrap items-center gap-2">
          <AdminLink href={`/admin/orders/${order.id}`}>Order detail</AdminLink>
          {!receiptLocked && <PosReceiptPrintButton />}
        </div>
      </div>

      {receiptLocked && (
        <div className="print:hidden mb-4 bg-amber-50 border border-amber-200 text-amber-950 text-sm px-4 py-3 rounded-xl">
          Receipt not available yet. Complete the contract in{" "}
          <AdminLink href={`/admin/legal/credit-contracts/${order.id}`}>
            Legal → Credit contracts
          </AdminLink>
          : generate the contract, collect signature and 70% down payment, then return here
          to print.
        </div>
      )}

      {voided && (
        <div className="print:hidden mb-4 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">
          This sale was voided ({order.status}). Stock has been restored.
        </div>
      )}

      <article
        className={`pos-receipt-print bg-white border border-wf-border p-6 print:border-0 print:p-2 print:text-[11px] ${
          receiptLocked ? "print:hidden opacity-60" : ""
        }`}
      >
        <header className="text-center border-b border-dashed border-wf-border pb-4 mb-4">
          <p className="text-xs tracking-[0.25em] uppercase">Cosy Aura</p>
          <h1 className="font-playfair text-xl mt-1">Sales receipt</h1>
          {branch && (
            <p className="text-xs mt-2 text-mocha">
              {branch.name}
              {branch.city ? ` · ${branch.city}` : ""} · {branch.country}
            </p>
          )}
          {branch?.address && (
            <p className="text-xs text-mocha mt-0.5">{branch.address}</p>
          )}
        </header>

        <div className="text-xs space-y-1 mb-4">
          <p>
            <span className="text-mocha">Receipt</span>{" "}
            <span className="font-mono font-medium">{receiptNo}</span>
          </p>
          <p>
            <span className="text-mocha">Date</span>{" "}
            {new Date(order.createdAt).toLocaleString()}
          </p>
          <p>
            <span className="text-mocha">Cashier</span>{" "}
            {order.posUser?.name || order.posUser?.email || "Staff"}
          </p>
          {order.commissionEmployee && (
            <p>
              <span className="text-mocha">Sales staff</span>{" "}
              {order.commissionEmployee.user.name ||
                order.commissionEmployee.user.email}
              {order.commissionEmployee.employeeNumber
                ? ` (${order.commissionEmployee.employeeNumber})`
                : ""}
            </p>
          )}
          <p>
            <span className="text-mocha">Payment</span>{" "}
            {paymentLabel(order.posPaymentMethod)}
          </p>
          {order.posPaymentReference && (
            <p>
              <span className="text-mocha">Reference</span>{" "}
              <span className="font-mono">{order.posPaymentReference}</span>
            </p>
          )}
          {voided && (
            <p className="text-red-700 font-medium uppercase tracking-wide">
              Voided · {order.status}
            </p>
          )}
          {order.shippingName && order.shippingName !== "Walk-in customer" && (
            <p>
              <span className="text-mocha">Customer</span> {order.shippingName}
            </p>
          )}
          {order.shippingPhone && (
            <p>
              <span className="text-mocha">Phone</span> {order.shippingPhone}
            </p>
          )}
        </div>

        <table className="w-full text-xs mb-4">
          <thead>
            <tr className="border-b border-wf-border">
              <th className="text-left py-1 font-medium">Item</th>
              <th className="text-center py-1 font-medium w-8">Qty</th>
              <th className="text-right py-1 font-medium w-16">Amt</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-wf-border/60">
                <td className="py-2 pr-2 align-top">
                  <p className="font-medium leading-snug">
                    {item.fragrance.brand.name} {item.fragrance.model}
                  </p>
                  <p className="text-mocha">{item.bottleSize}ml · {item.fragrance.reference}</p>
                </td>
                <td className="py-2 text-center align-top">{item.quantity}</td>
                <td className="py-2 text-right align-top">
                  {formatPrice(item.price * item.quantity, "GHS")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-dashed border-wf-border pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-mocha">
            <span>Subtotal</span>
            <span>{formatPrice(itemsSubtotal, "GHS")}</span>
          </div>
          {discountAmount > 0 && order.posDiscountType && order.posDiscountValue != null && (
            <div className="flex justify-between text-mocha">
              <span>
                Discount ({formatPosDiscountLabel(order.posDiscountType, order.posDiscountValue)})
              </span>
              <span>−{formatPrice(discountAmount, "GHS")}</span>
            </div>
          )}
          <PosTaxSummary
            taxes={receiptTax.breakdown}
            showGhanaLevies={receiptTax.showGhanaLevies}
            formatAmount={(amount) => formatPrice(amount, "GHS")}
            showTaxable
            className="pt-2 border-t border-dashed border-wf-border/60"
          />
        </div>

        {credit && (
          <div className="mt-4 border-t border-dashed border-wf-border pt-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-mocha">Down payment (70%)</span>
              <span className="font-medium">{formatPrice(credit.downPaymentGhs, "GHS")}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Balance due (30%)</span>
              <span>{formatPrice(creditRemaining, "GHS")}</span>
            </div>
          </div>
        )}

        {order.posNotes && (
          <p className="text-xs text-mocha mt-4 border-t border-dashed border-wf-border pt-3">
            Note: {order.posNotes}
          </p>
        )}

        <footer className="text-center text-xs text-mocha mt-6 pt-4 border-t border-dashed border-wf-border">
          <div className="mb-4 flex justify-center">
            <PosReceiptQr value={qrValue} label={`Receipt ${receiptNo}`} />
          </div>
          <p>Thank you for shopping with Cosy Aura</p>
          <p className="mt-1">support@cosyaura.com · cosyaura.com</p>
        </footer>
      </article>
    </div>
  );
}
