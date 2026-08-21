import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireAdminPage, orderBranchWhere } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { resolveShippingMethodLabel } from "@/lib/shipping-methods";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import { ResendOrderEmailButton } from "@/components/admin/ResendOrderEmailButton";
import { OrderTrackingForm } from "@/components/admin/OrderTrackingForm";
import { OrderFulfillmentBranchSelect } from "@/components/admin/OrderFulfillmentBranchSelect";
import { resolveTrackingUrl } from "@/lib/order-tracking";
import { deliveryDateIso, formatDeliveryDateLabel } from "@/lib/delivery-dates";
import { receiptToken } from "@/lib/order-receipt";

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

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <Link
            href="/admin/orders"
            className="text-sm text-gold hover:text-gold-light mb-2 inline-block"
          >
            ← All orders
          </Link>
          <h1 className="font-playfair text-3xl">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-wf-gray mt-1">
            Placed {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/api/receipts/${order.id}?t=${receiptToken(order.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gold hover:underline"
          >
            Download PDF receipt
          </a>
          <Link
            href={`/admin/orders/${order.id}/pack-slip`}
            className="text-sm text-gold hover:underline"
          >
            Pack slip
          </Link>
          <span className="text-sm text-wf-gray">Status</span>
          <OrderStatusSelect orderId={order.id} status={order.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white border border-wf-border rounded-lg p-6">
            <h2 className="font-playfair text-xl mb-4">Items</h2>
            <ul className="divide-y divide-wf-border">
              {order.items.map((item) => (
                <li key={item.id} className="py-4 flex gap-4">
                  <div className="relative w-20 h-20 bg-wf-light shrink-0 overflow-hidden">
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
                      className="font-medium hover:text-gold"
                    >
                      {item.fragrance.brand.name} {item.fragrance.model}
                    </Link>
                    <p className="text-sm text-wf-gray">
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
            <div className="border-t border-wf-border pt-4 mt-2 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-wf-gray">Subtotal</span>
                <span>{formatPrice(order.total - (order.shippingCost ?? 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-wf-gray">
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
                <span className="font-medium">Total</span>
                <span className="font-playfair text-xl">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white border border-wf-border rounded-lg p-6">
            <h2 className="font-playfair text-xl mb-4">Customer</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-wf-gray">Email</dt>
                <dd>
                  <a
                    href={`mailto:${order.email}`}
                    className="text-gold hover:underline"
                  >
                    {order.email}
                  </a>
                </dd>
              </div>
              {order.user && (
                <div>
                  <dt className="text-wf-gray">Account</dt>
                  <dd>{order.user.name || order.user.email}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="bg-white border border-wf-border rounded-lg p-6">
            <h2 className="font-playfair text-xl mb-4">Shipping</h2>
            {order.shippingMethod && (
              <p className="text-sm mb-3">
                <span className="text-wf-gray">Method: </span>
                {shippingLabel}
                {" · "}
                {(order.shippingCost ?? 0) === 0
                  ? "Free"
                  : formatPrice(order.shippingCost ?? 0)}
              </p>
            )}
            {order.shippingName || order.shippingAddress ? (
              <address className="text-sm not-italic leading-relaxed text-wf-gray mb-4">
                {order.shippingName && (
                  <span className="block text-wf-black font-medium">
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
                  <span className="block mt-2 text-wf-black">
                    Fulfilment: {order.fulfillmentBranch.name} (
                    {order.fulfillmentBranch.country})
                  </span>
                )}
                {deliveryLabel && (
                  <span className="block mt-2 text-wf-black">
                    Delivery: {deliveryLabel}
                  </span>
                )}
              </address>
            ) : (
              <p className="text-sm text-wf-gray mb-4">
                Shipping details appear after checkout completes.
              </p>
            )}

            <div className="mb-4 pb-4 border-b border-wf-border">
              <OrderFulfillmentBranchSelect
                orderId={order.id}
                currentBranchId={order.fulfillmentBranchId}
                shippingCountry={order.shippingCountry}
              />
            </div>

            {(order.trackingNumber || resolveTrackingUrl(order)) && (
              <div className="text-sm mb-4 pb-4 border-b border-wf-border space-y-1">
                {order.carrier && (
                  <p>
                    <span className="text-wf-gray">Carrier: </span>
                    {order.carrier}
                  </p>
                )}
                {order.trackingNumber && (
                  <p>
                    <span className="text-wf-gray">Tracking #: </span>
                    <span className="font-mono">{order.trackingNumber}</span>
                  </p>
                )}
                {resolveTrackingUrl(order) && (
                  <a
                    href={resolveTrackingUrl(order)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold hover:underline"
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

          <section className="bg-white border border-wf-border rounded-lg p-6">
            <h2 className="font-playfair text-xl mb-4">Payment</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-wf-gray">Status</dt>
                <dd>{order.status}</dd>
              </div>
              <div>
                <dt className="text-wf-gray">Confirmation email</dt>
                <dd>
                  {order.confirmationEmailedAt
                    ? `Sent ${new Date(order.confirmationEmailedAt).toLocaleString()}`
                    : "Not sent yet"}
                </dd>
              </div>
              {order.paymentProvider && (
                <div>
                  <dt className="text-wf-gray">Provider</dt>
                  <dd className="capitalize">{order.paymentProvider}</dd>
                </div>
              )}
              {order.stripeSessionId && (
                <div>
                  <dt className="text-wf-gray">Stripe session</dt>
                  <dd className="font-mono text-xs break-all">
                    {order.stripeSessionId}
                  </dd>
                </div>
              )}
              {order.paystackReference && (
                <div>
                  <dt className="text-wf-gray">Paystack reference</dt>
                  <dd className="font-mono text-xs break-all">
                    {order.paystackReference}
                  </dd>
                </div>
              )}
              {order.flutterwaveTxRef && (
                <div>
                  <dt className="text-wf-gray">Flutterwave reference</dt>
                  <dd className="font-mono text-xs break-all">
                    {order.flutterwaveTxRef}
                  </dd>
                </div>
              )}
              {order.stripePaymentId && (
                <div>
                  <dt className="text-wf-gray">
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
                  <dt className="text-wf-gray">Phone</dt>
                  <dd>{order.shippingPhone}</dd>
                </div>
              )}
            </dl>
            {order.status !== "PENDING" && (
              <div className="mt-4 pt-4 border-t border-wf-border">
                <ResendOrderEmailButton orderId={order.id} />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
