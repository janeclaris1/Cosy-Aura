import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireAdminPage, orderBranchWhere } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  formatOrderBookTotal,
  formatOrderPaidAmount,
} from "@/lib/order-money";
import { formatPrice } from "@/lib/utils";
import { resolveShippingMethodLabel } from "@/lib/shipping-methods";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import { ResendOrderEmailButton } from "@/components/admin/ResendOrderEmailButton";
import { OrderTrackingForm } from "@/components/admin/OrderTrackingForm";
import { OrderFulfillmentBranchSelect } from "@/components/admin/OrderFulfillmentBranchSelect";
import { resolveTrackingUrl } from "@/lib/order-tracking";
import { deliveryDateIso, formatDeliveryDateLabel } from "@/lib/delivery-dates";
import { receiptToken } from "@/lib/order-receipt";
import { PosVoidButton } from "@/components/admin/PosVoidButton";
import { PosTaxSummary } from "@/components/admin/PosTaxSummary";
import { formatPosDiscountLabel } from "@/lib/pos-discount";
import { extractGhanaPosTaxBreakdown } from "@/lib/pos-taxes";
import { AdminLink, adminPageWrap } from "@/components/admin/admin-ui";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await requireAdminPage("orders.read");

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          fragrance: {
            include: {
              brand: true,
              images: { orderBy: { sortOrder: "asc" }, take: 1 },
            },
          },
        },
      },
      user: true,
      fulfillmentBranch: true,
      posUser: { select: { name: true, email: true } },
    },
  });

  if (!order) notFound();

  const scope = orderBranchWhere(ctx);
  if (scope) {
    const allowed = await prisma.order.findFirst({
      where: { id: order.id, ...(scope as object) },
      select: { id: true },
    });
    if (!allowed) notFound();
  }

  const shippingLabel = await resolveShippingMethodLabel(order.shippingMethod);
  const deliveryIso = deliveryDateIso(order.deliveryDate);
  const deliveryLabel = deliveryIso ? formatDeliveryDateLabel(deliveryIso) : null;
  const isPos = order.channel === "POS";
  const posVoided =
    order.status === "REFUNDED" || order.status === "CANCELLED";
  const itemsSubtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const posDiscountAmount = Number(order.posDiscountAmount || 0);
  const posInclusiveTotal = Math.max(0, itemsSubtotal - posDiscountAmount);
  const posTaxes = isPos ? extractGhanaPosTaxBreakdown(posInclusiveTotal) : null;

  function posPaymentLabel(method: string | null) {
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

  return (
    <div className={adminPageWrap}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <AdminLink href="/admin/orders" className="text-sm mb-2 inline-block">
            ← All orders
          </AdminLink>
          <p className="text-[11px] uppercase tracking-[0.2em] text-mocha mb-2">
            Sales
          </p>
          <h1 className="font-playfair text-3xl text-[#03045e]">
            {isPos && order.receiptNumber
              ? order.receiptNumber
              : `Order #${order.id.slice(0, 8).toUpperCase()}`}
          </h1>
          <p className="text-sm text-mocha mt-1">
            Placed {new Date(order.createdAt).toLocaleString()}
            {isPos && (
              <span className="ml-2 text-[10px] uppercase tracking-wider bg-[#FFD200]/30 text-[#03045e] px-2 py-0.5 ring-1 ring-[#FFD200]/50">
                POS
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isPos ? (
            <AdminLink href={`/admin/pos/receipt/${order.id}`} className="text-sm">
              POS receipt
            </AdminLink>
          ) : (
            <a
              href={`/api/receipts/${order.id}?t=${receiptToken(order.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#03045e] hover:underline font-medium"
            >
              Download PDF receipt
            </a>
          )}
          {!isPos && (
            <AdminLink href={`/admin/orders/${order.id}/pack-slip`} className="text-sm">
              Pack slip
            </AdminLink>
          )}
          <span className="text-sm text-mocha">Status</span>
          <OrderStatusSelect orderId={order.id} status={order.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white shadow-sm ring-1 ring-black/[0.04] p-5 sm:p-6">
            <h2 className="font-playfair text-lg text-[#03045e] mb-4">Items</h2>
            <ul className="divide-y divide-wf-border">
              {order.items.map((item) => (
                <li key={item.id} className="py-4 flex gap-4">
                  <div className="relative w-20 h-20 bg-[#fafafa] shrink-0 overflow-hidden">
                    {item.fragrance.images[0] && (
                      <Image
                        src={item.fragrance.images[0].url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/fragrances/${item.fragrance.slug}`}
                      className="font-medium hover:text-[#03045e]"
                    >
                      {item.fragrance.brand.name} {item.fragrance.model}
                    </Link>
                    <p className="text-sm text-mocha">
                      Ref. {item.fragrance.reference}
                    </p>
                    <p className="text-sm mt-1">
                      {formatPrice(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="border-t border-stone-100 pt-4 mt-2 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-mocha">Subtotal</span>
                <span>
                  {formatPrice(
                    isPos ? itemsSubtotal : order.total - (order.shippingCost ?? 0)
                  )}
                </span>
              </div>
              {isPos && posDiscountAmount > 0 && order.posDiscountType && order.posDiscountValue != null && (
                <div className="flex justify-between text-emerald-800">
                  <span>
                    Discount (
                    {formatPosDiscountLabel(order.posDiscountType, order.posDiscountValue)})
                  </span>
                  <span>−{formatPrice(posDiscountAmount)}</span>
                </div>
              )}
              {isPos && posTaxes && posTaxes.total > 0 && (
                <PosTaxSummary
                  taxes={posTaxes}
                  formatAmount={formatPrice}
                  showTotal={false}
                  className="text-sm"
                />
              )}
              <div className="flex justify-between">
                <span className="text-mocha">
                  Shipping
                  {order.shippingMethod ? ` (${shippingLabel})` : ""}
                </span>
                <span>
                  {(order.shippingCost ?? 0) === 0
                    ? "Free"
                    : formatPrice(order.shippingCost ?? 0)}
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="font-medium">
                  {order.chargeCurrency &&
                  order.chargeCurrency.toUpperCase() !== "GHS"
                    ? "Paid"
                    : "Total"}
                </span>
                <span className="font-playfair text-xl text-right">
                  {formatOrderPaidAmount(order)}
                  {order.chargeCurrency &&
                  order.chargeCurrency.toUpperCase() !== "GHS" ? (
                    <span className="block text-xs font-roboto text-mocha mt-0.5">
                      Book value {formatOrderBookTotal(order)}
                    </span>
                  ) : null}
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white shadow-sm ring-1 ring-black/[0.04] p-5 sm:p-6">
            <h2 className="font-playfair text-lg text-[#03045e] mb-4">Customer</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-mocha">Email</dt>
                <dd>
                  <a
                    href={`mailto:${order.email}`}
                    className="text-[#03045e] hover:underline font-medium"
                  >
                    {order.email}
                  </a>
                </dd>
              </div>
              {order.user && (
                <div>
                  <dt className="text-mocha">Account</dt>
                  <dd>{order.user.name || order.user.email}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="bg-white shadow-sm ring-1 ring-black/[0.04] p-5 sm:p-6">
            <h2 className="font-playfair text-lg text-[#03045e] mb-4">Shipping</h2>
            {order.shippingMethod && (
              <p className="text-sm mb-3">
                <span className="text-mocha">Method: </span>
                {shippingLabel}
                {" · "}
                {(order.shippingCost ?? 0) === 0
                  ? "Free"
                  : formatPrice(order.shippingCost ?? 0)}
              </p>
            )}
            {order.shippingName || order.shippingAddress ? (
              <address className="text-sm not-italic leading-relaxed text-mocha mb-4">
                {order.shippingName && (
                  <span className="block text-espresso font-medium">
                    {order.shippingName}
                  </span>
                )}
                {order.shippingAddress && <span className="block">{order.shippingAddress}</span>}
                {(order.shippingCity || order.shippingPostcode) && (
                  <span className="block">
                    {[order.shippingCity, order.shippingPostcode]
                      .filter(Boolean)
                      .join(" ")}
                  </span>
                )}
                {order.shippingCountry && (
                  <span className="block">{order.shippingCountry}</span>
                )}
                {order.fulfillmentBranch && (
                  <span className="block mt-2 text-espresso">
                    Fulfilment: {order.fulfillmentBranch.name} (
                    {order.fulfillmentBranch.country})
                  </span>
                )}
                {deliveryLabel && (
                  <span className="block mt-2 text-espresso">
                    Delivery: {deliveryLabel}
                  </span>
                )}
              </address>
            ) : (
              <p className="text-sm text-mocha mb-4">
                Shipping details appear after checkout completes.
              </p>
            )}

            <div className="mb-4 pb-4 border-b border-stone-100">
              <OrderFulfillmentBranchSelect
                orderId={order.id}
                currentBranchId={order.fulfillmentBranchId}
                shippingCountry={order.shippingCountry}
              />
            </div>

            {(order.trackingNumber || resolveTrackingUrl(order)) && (
              <div className="text-sm mb-4 pb-4 border-b border-stone-100 space-y-1">
                {order.carrier && (
                  <p>
                    <span className="text-mocha">Carrier: </span>
                    {order.carrier}
                  </p>
                )}
                {order.trackingNumber && (
                  <p>
                    <span className="text-mocha">Tracking #: </span>
                    <span className="font-mono">{order.trackingNumber}</span>
                  </p>
                )}
                {resolveTrackingUrl(order) && (
                  <a
                    href={resolveTrackingUrl(order)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#03045e] hover:underline font-medium"
                  >
                    Open tracking link
                  </a>
                )}
              </div>
            )}

            <h3 className="text-sm font-medium mb-3">Update tracking</h3>
            <OrderTrackingForm
              orderId={order.id}
              trackingNumber={order.trackingNumber}
              trackingUrl={order.trackingUrl}
              carrier={order.carrier}
              status={order.status}
            />
          </section>

          {isPos && (
            <section className="bg-white shadow-sm ring-1 ring-black/[0.04] p-5 sm:p-6">
              <h2 className="font-playfair text-lg text-[#03045e] mb-4">Point of sale</h2>
              <dl className="space-y-3 text-sm mb-4">
                <div>
                  <dt className="text-mocha">Receipt</dt>
                  <dd className="font-mono">{order.receiptNumber || "—"}</dd>
                </div>
                <div>
                  <dt className="text-mocha">Cashier</dt>
                  <dd>{order.posUser?.name || order.posUser?.email || "—"}</dd>
                </div>
                <div>
                  <dt className="text-mocha">Payment</dt>
                  <dd>{posPaymentLabel(order.posPaymentMethod)}</dd>
                </div>
                {order.posPaymentReference && (
                  <div>
                    <dt className="text-mocha">Reference</dt>
                    <dd className="font-mono text-xs break-all">
                      {order.posPaymentReference}
                    </dd>
                  </div>
                )}
                {order.posNotes && (
                  <div>
                    <dt className="text-mocha">Notes</dt>
                    <dd>{order.posNotes}</dd>
                  </div>
                )}
              </dl>
              {posVoided ? (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">
                  Sale voided — branch stock restored.
                </p>
              ) : (
                <PosVoidButton
                  orderId={order.id}
                  receiptNumber={order.receiptNumber}
                />
              )}
            </section>
          )}

          <section className="bg-white shadow-sm ring-1 ring-black/[0.04] p-5 sm:p-6">
            <h2 className="font-playfair text-lg text-[#03045e] mb-4">Payment</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-mocha">Status</dt>
                <dd>{order.status}</dd>
              </div>
              <div>
                <dt className="text-mocha">Confirmation email</dt>
                <dd>
                  {order.confirmationEmailedAt
                    ? `Sent ${new Date(order.confirmationEmailedAt).toLocaleString()}`
                    : "Not sent yet"}
                </dd>
              </div>
              {order.paymentProvider && (
                <div>
                  <dt className="text-mocha">Provider</dt>
                  <dd className="capitalize">{order.paymentProvider}</dd>
                </div>
              )}
              {order.stripeSessionId && (
                <div>
                  <dt className="text-mocha">Stripe session</dt>
                  <dd className="font-mono text-xs break-all">
                    {order.stripeSessionId}
                  </dd>
                </div>
              )}
              {order.paystackReference && (
                <div>
                  <dt className="text-mocha">Paystack reference</dt>
                  <dd className="font-mono text-xs break-all">
                    {order.paystackReference}
                  </dd>
                </div>
              )}
              {order.flutterwaveTxRef && (
                <div>
                  <dt className="text-mocha">Flutterwave reference</dt>
                  <dd className="font-mono text-xs break-all">
                    {order.flutterwaveTxRef}
                  </dd>
                </div>
              )}
              {order.stripePaymentId && (
                <div>
                  <dt className="text-mocha">
                    {order.paymentProvider === "paystack"
                      ? "Paystack transaction"
                      : order.paymentProvider === "flutterwave"
                        ? "Flutterwave transaction"
                        : "Payment intent"}
                  </dt>
                  <dd className="font-mono text-xs break-all">
                    {order.stripePaymentId}
                  </dd>
                </div>
              )}
              {order.shippingPhone && (
                <div>
                  <dt className="text-mocha">Phone</dt>
                  <dd>{order.shippingPhone}</dd>
                </div>
              )}
            </dl>
            {order.status !== "PENDING" && (
              <div className="mt-4 pt-4 border-t border-stone-100">
                <ResendOrderEmailButton orderId={order.id} />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
