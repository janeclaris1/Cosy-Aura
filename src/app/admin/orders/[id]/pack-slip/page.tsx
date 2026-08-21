import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage, orderBranchWhere } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { resolveShippingMethodLabel } from "@/lib/shipping-methods";
import { formatDeliveryDateLabel, deliveryDateIso } from "@/lib/delivery-dates";
import { PackSlipPrintButton } from "@/components/admin/PackSlipPrintButton";

export default async function OrderPackSlipPage({
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
          fragrance: { include: { brand: true } },
        },
      },
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
  const shortId = order.id.slice(0, 8).toUpperCase();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link href={`/admin/orders/${order.id}`} className="text-sm text-gold hover:underline">
          ← Back to order
        </Link>
        <PackSlipPrintButton />
      </div>

      <article className="bg-white border border-wf-border p-8 print:border-0 print:p-0">
        <header className="border-b border-wf-border pb-4 mb-6">
          <p className="text-xs tracking-[0.2em] text-mocha mb-1">COSY AURA</p>
          <h1 className="font-playfair text-3xl">Pack slip</h1>
          <p className="text-sm mt-2">
            Order <span className="font-mono">#{shortId}</span> ·{" "}
            {new Date(order.createdAt).toLocaleString()}
          </p>
          <p className="text-sm text-mocha mt-1">Status: {order.status}</p>
        </header>

        <div className="grid sm:grid-cols-2 gap-6 mb-8 text-sm">
          <section>
            <h2 className="font-medium mb-2">Ship to</h2>
            <p>{order.shippingName || "—"}</p>
            <p>{order.shippingPhone || order.email}</p>
            <p>{order.shippingAddress || "—"}</p>
            <p>
              {[order.shippingCity, order.shippingPostcode, order.shippingCountry]
                .filter(Boolean)
                .join(", ") || "—"}
            </p>
            {order.shippingRegion ? <p>Region: {order.shippingRegion}</p> : null}
          </section>
          <section>
            <h2 className="font-medium mb-2">Fulfilment</h2>
            <p>
              Branch:{" "}
              {order.fulfillmentBranch
                ? `${order.fulfillmentBranch.name} (${order.fulfillmentBranch.country})`
                : "Unassigned"}
            </p>
            <p>Courier / method: {shippingLabel || order.shippingMethod || "—"}</p>
            {order.deliveryProvider ? <p>Provider: {order.deliveryProvider}</p> : null}
            {deliveryLabel ? <p>Delivery date: {deliveryLabel}</p> : null}
            {order.dawuroboPayer ? <p>Payment mode: {order.dawuroboPayer}</p> : null}
            <p className="mt-2">Order total: {formatPrice(order.total)}</p>
          </section>
        </div>

        <section>
          <h2 className="font-medium mb-3">Pick list</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wf-border text-left">
                <th className="py-2 pr-2 w-8">□</th>
                <th className="py-2 pr-2">Product</th>
                <th className="py-2 pr-2">Size</th>
                <th className="py-2 pr-2">Qty</th>
                <th className="py-2">Ref</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-wf-border/60">
                  <td className="py-3 pr-2 align-top">□</td>
                  <td className="py-3 pr-2">
                    {item.fragrance.brand.name} {item.fragrance.model}
                  </td>
                  <td className="py-3 pr-2">{item.bottleSize}ml</td>
                  <td className="py-3 pr-2 font-medium">{item.quantity}</td>
                  <td className="py-3 font-mono text-xs text-mocha">
                    {item.fragrance.reference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="mt-10 pt-4 border-t border-wf-border text-sm space-y-2">
          <p>□ Packed by _______________ &nbsp;&nbsp; Time _______________</p>
          <p>□ Checked by _______________</p>
          <p className="text-xs text-mocha pt-4">
            Printed {new Date().toLocaleString()} · Cosy Aura ops
          </p>
        </footer>
      </article>
    </div>
  );
}
