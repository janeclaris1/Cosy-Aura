"use client";

import { useEffect, useState } from "react";
import { useLocaleStore } from "@/lib/locale-store";
import { shippingUsdToGhs } from "@/lib/fx";
import { formatPrice } from "@/lib/utils";
import {
  checkoutFieldsetClass,
  checkoutFormClass,
  checkoutInputClass,
  checkoutLabelClass,
  checkoutLegendClass,
  checkoutOptionClass,
} from "@/components/checkout/checkout-ui";
import { useCheckoutAbandonSync } from "@/lib/use-checkout-abandon-sync";
import type { RegionalCartItem } from "@/components/checkout/RegionalCheckoutForm";

type AramexRate = {
  id: string;
  name: string;
  eta: string;
  price: number;
  currency: string;
};

export type InternationalAramexCheckoutPayload = {
  email: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  shippingRateId: string;
  shippingPriceUsd: number;
  shopperCountry: string;
};

export function InternationalAramexCheckout({
  shopperCountry,
  items,
  subtotalGhs,
  onContinue,
  loading,
  error: externalError,
}: {
  shopperCountry: string;
  items: RegionalCartItem[];
  subtotalGhs: number;
  onContinue: (payload: InternationalAramexCheckoutPayload) => void;
  loading?: boolean;
  error?: string | null;
}) {
  const currency = useLocaleStore((s) => s.currency);
  const rates = useLocaleStore((s) => s.rates);
  const [form, setForm] = useState({
    email: "",
    name: "",
    phone: "",
    address: "",
    city: "",
    postcode: "",
  });
  const [aramexRates, setAramexRates] = useState<AramexRate[]>([]);
  const [aramexRateId, setAramexRateId] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useCheckoutAbandonSync({
    email: form.email,
    items,
    subtotalGhs,
    displayCurrency: currency,
    shippingCountry: shopperCountry,
    customerName: form.name,
    customerPhone: form.phone,
    checkoutProvider: "stripe",
  });

  const selectedRate =
    aramexRates.find((rate) => rate.id === aramexRateId) || aramexRates[0];

  useEffect(() => {
    if (!form.address.trim() || !form.city.trim()) {
      setAramexRates([]);
      setAramexRateId("");
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setQuoting(true);
      try {
        const res = await fetch("/api/shipping/rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            country: shopperCountry,
            ...form,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setAramexRates([]);
          setAramexRateId("");
          setError(data.error || "Could not fetch Aramex rates");
          return;
        }
        const nextRates = (data.rates || []) as AramexRate[];
        setAramexRates(nextRates);
        setError(null);
        setAramexRateId((current) => {
          if (current && nextRates.some((rate) => rate.id === current)) return current;
          return nextRates[0]?.id || "";
        });
      } catch {
        if (!cancelled) {
          setAramexRates([]);
          setAramexRateId("");
          setError("Could not fetch Aramex rates");
        }
      } finally {
        if (!cancelled) setQuoting(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [shopperCountry, form]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRate || !aramexRateId) {
      setError("Enter your address and select an Aramex shipping option.");
      return;
    }
    setError(null);
    onContinue({
      ...form,
      shippingRateId: aramexRateId,
      shippingPriceUsd: selectedRate.price,
      shopperCountry,
    });
  }

  const displayError = externalError || error;

  return (
    <form onSubmit={handleSubmit} className={checkoutFormClass}>
      <h2 className="font-playfair text-xl text-espresso">Delivery &amp; International shipping</h2>
      <p className="-mt-1 rounded-lg border border-[#FFD200]/45 bg-[#FFD200]/12 px-3.5 py-2.5 text-sm font-medium text-espresso">
        International orders ship via Aramex. Enter your address for a live quote.
      </p>

      <label className={checkoutLabelClass}>
        Email
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={checkoutInputClass}
        />
      </label>
      <label className={checkoutLabelClass}>
        Full name
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={checkoutInputClass}
        />
      </label>
      <label className={checkoutLabelClass}>
        Phone / WhatsApp
        <input
          required
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className={checkoutInputClass}
        />
      </label>
      <label className={checkoutLabelClass}>
        Address
        <input
          required
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className={checkoutInputClass}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={checkoutLabelClass}>
          City
          <input
            required
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className={checkoutInputClass}
          />
        </label>
        <label className={checkoutLabelClass}>
          Postal code
          <input
            required
            value={form.postcode}
            onChange={(e) => setForm({ ...form, postcode: e.target.value })}
            className={checkoutInputClass}
          />
        </label>
      </div>

      <fieldset className={checkoutFieldsetClass}>
        <legend className={checkoutLegendClass}>Aramex shipping</legend>
        {quoting ? (
          <p className="text-sm text-mocha px-1">Fetching Aramex rates…</p>
        ) : aramexRates.length > 0 ? (
          aramexRates.map((rate) => (
            <label
              key={rate.id}
              className={checkoutOptionClass}
            >
              <input
                type="radio"
                name="aramex"
                checked={aramexRateId === rate.id}
                onChange={() => setAramexRateId(rate.id)}
              />
              <span className="flex-1 font-medium">
                {rate.name} · {rate.eta}
              </span>
              <span className="shrink-0">
                {formatPrice(shippingUsdToGhs(rate.price, rates), currency)}
              </span>
            </label>
          ))
        ) : (
          <p className="text-sm text-mocha px-1">
            Complete your address above to see Aramex rates.
          </p>
        )}
      </fieldset>

      {displayError ? <p className="text-sm text-red-600">{displayError}</p> : null}

      <button type="submit" disabled={loading || quoting} className="btn-gold w-full disabled:opacity-50">
        {loading ? "Loading secure checkout…" : "Continue to payment"}
      </button>
    </form>
  );
}
