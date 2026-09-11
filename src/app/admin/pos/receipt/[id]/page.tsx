import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage, orderBranchWhere } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { PosReceiptPrintButton } from "@/components/admin/PosReceiptPrintButton";
import { PosReceiptAutoPrint } from "@/components/admin/PosReceiptAutoPrint";
import { PosReceiptQr } from "@/components/admin/PosReceiptQr";
import { PosTaxSummary } from "@/components/admin/PosTaxSummary";
import { formatPosDiscountLabel } from "@/lib/pos-discount";
import { extractGhanaPosTaxBreakdown } from "@/lib/pos-taxes";
import { siteUrl } from "@/lib/seo";

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
  const taxes = extractGhanaPosTaxBreakdown(inclusiveTotal);

  return (
    <div className="pos-receipt-print-root max-w-sm mx-auto p-4 print:p-0 print:max-w-none">
      {!voided && <PosReceiptAutoPrint />}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 mb-4">
        <Link href="/admin/pos" className="text-sm text-gold hover:underline">
          ← Back to POS
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/orders/${order.id}`}
            className="text-sm text-mocha hover:underline"
          >
            Order detail
          </Link>
          <PosReceiptPrintButton />
        </div>
      </div>

      {voided && (
        <div className="print:hidden mb-4 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">
          This sale was voided ({order.status}). Stock has been restored.
        </div>
      )}

      <article className="pos-receipt-print bg-white border border-wf-border p-6 print:border-0 print:p-2 print:text-[11px]">
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
            taxes={taxes}
            formatAmount={(amount) => formatPrice(amount, "GHS")}
            showTaxable
            className="pt-2 border-t border-dashed border-wf-border/60"
          />
        </div>

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
