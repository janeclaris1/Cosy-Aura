"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { OrderStatus } from "@prisma/client";
import { OrderStatusTimeline } from "@/components/orders/OrderStatusTimeline";
import { formatPrice } from "@/lib/utils";
import { useLocaleStore } from "@/lib/locale-store";
import { deliveryDateIso, formatDeliveryDateLabel } from "@/lib/delivery-dates";

type TrackedOrder = {
  id: string;
  ref: string;
  status: OrderStatus;
  statusLabel: string;
  total: number;
  createdAt: string;
  shippedAt: string | null;
  shippingMethod: string | null;
  shippingCity: string | null;
  shippingCountry: string | null;
  deliveryDate: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  items: {
    quantity: number;
    price: number;
    brand: string;
    model: string;
    reference: string;
    image: string | null;
  }[];
};

export function TrackOrderForm({
  initialRef = "",
  initialEmail = "",
}: {
  initialRef?: string;
  initialEmail?: string;
}) {
  const currency = useLocaleStore((s) => s.currency);
  useLocaleStore((s) => s.rates);
  const [orderRef, setOrderRef] = useState(initialRef);
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  async function lookup(refValue: string, emailValue: string) {
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderRef: refValue, email: emailValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Order not found");
      }
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order not found");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialRef && initialEmail) {
      void lookup(initialRef, initialEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await lookup(orderRef, email);
  }

  return (
    <div className="space-y-10">
      <form onSubmit={onSubmit} className="max-w-xl space-y-4">
        <div>
          <label htmlFor="orderRef" className="block text-sm mb-1.5">
            Order number
          </label>
          <input
            id="orderRef"
            value={orderRef}
            onChange={(e) => setOrderRef(e.target.value)}
            placeholder="e.g. CMSEORFJ"
            required
            className="w-full px-4 py-3 border border-wf-border text-sm focus:outline-none focus:border-gold bg-white"
          />
          <p className="text-xs text-wf-gray mt-1.5">
            Use the 8-character reference from your confirmation email.
          </p>
        </div>
        <div>
          <label htmlFor="email" className="block text-sm mb-1.5">
            Email used at checkout
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-wf-border text-sm focus:outline-none focus:border-gold bg-white"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="btn-gold disabled:opacity-50"
        >
          {loading ? "Looking up…" : "Track order"}
        </button>
      </form>

      {order && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 border-t border-wf-border pt-10">
          <div>
            <p className="text-sm text-wf-gray mb-1">Order</p>
            <h2 className="font-playfair text-2xl mb-1">#{order.ref}</h2>
            <p className="text-sm text-wf-gray mb-6">
              Placed {new Date(order.createdAt).toLocaleDateString()} ·{" "}
              {formatPrice(order.total, currency)}
            </p>

            <OrderStatusTimeline status={order.status} />

            {(order.trackingNumber || order.trackingUrl) && (
              <div className="mt-6 border border-wf-border p-4 bg-wf-light">
                <p className="text-sm font-medium mb-2">Shipment tracking</p>
                {order.carrier && (
                  <p className="text-sm text-wf-gray">Carrier: {order.carrier}</p>
                )}
                {order.trackingNumber && (
                  <p className="text-sm mt-1">
                    Tracking #:{" "}
                    <span className="font-mono">{order.trackingNumber}</span>
                  </p>
                )}
                {order.trackingUrl && (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 text-sm text-gold hover:underline"
                  >
                    Open carrier tracking →
                  </a>
                )}
                {order.shippedAt && (
                  <p className="text-xs text-wf-gray mt-3">
                    Shipped {new Date(order.shippedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {(order.shippingCity || order.shippingCountry) && (
              <p className="text-sm text-wf-gray mt-4">
                Destination:{" "}
                {[order.shippingCity, order.shippingCountry]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            {order.deliveryDate && deliveryDateIso(order.deliveryDate) && (
              <p className="text-sm text-wf-gray mt-1">
                Requested delivery:{" "}
                {formatDeliveryDateLabel(deliveryDateIso(order.deliveryDate)!)}
              </p>
            )}
          </div>

          <div>
            <h3 className="font-medium mb-4">Items</h3>
            <ul className="divide-y divide-wf-border border border-wf-border bg-white">
              {order.items.map((item, idx) => (
                <li key={`${item.reference}-${idx}`} className="p-4 flex gap-4">
                  <div className="relative w-16 h-16 bg-wf-light shrink-0 overflow-hidden">
                    {item.image && (
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {item.brand} {item.model}
                    </p>
                    <p className="text-sm text-wf-gray">
                      Ref. {item.reference}
                    </p>
                    <p className="text-sm mt-1">
                      {formatPrice(item.price, currency)} × {item.quantity}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-sm text-wf-gray mt-4">
              Need help?{" "}
              <Link href="/contact" className="text-gold hover:underline">
                Contact support
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
