"use client";

import { useState } from "react";
import { WhatsAppOrderButton } from "@/components/checkout/WhatsAppOrderButton";
import {
  checkoutFormClass,
  checkoutInputClass,
  checkoutLabelClass,
} from "@/components/checkout/checkout-ui";

type Line = {
  brand?: string;
  model: string;
  quantity: number;
  sizeMl?: number;
  price: number;
};

/** Lightweight details capture when shopper lands via WhatsApp on Stripe/other route. */
export function WhatsAppDetailsCheckout({
  lines,
  total,
  countryOverride,
}: {
  lines: Line[];
  total: number;
  countryOverride?: string | null;
}) {
  const [form, setForm] = useState({
    email: "",
    name: "",
    phone: "",
    address: "",
    city: "",
  });
  const [error, setError] = useState<string | null>(null);
  const ready =
    Boolean(form.name.trim()) &&
    Boolean(form.email.trim()) &&
    Boolean(form.phone.trim()) &&
    Boolean(form.address.trim());

  return (
    <div className={checkoutFormClass}>
      <p className="text-sm text-wf-gray">
        Enter your contact and delivery details, then submit on WhatsApp.
      </p>

      <label className={checkoutLabelClass}>
        Email
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={checkoutInputClass}
          required
        />
      </label>
      <label className={checkoutLabelClass}>
        Full name
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={checkoutInputClass}
          required
        />
      </label>
      <label className={checkoutLabelClass}>
        Phone
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className={checkoutInputClass}
          required
        />
      </label>
      <label className={checkoutLabelClass}>
        Address
        <input
          type="text"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className={checkoutInputClass}
          required
        />
      </label>
      <label className={checkoutLabelClass}>
        City
        <input
          type="text"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          className={checkoutInputClass}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <WhatsAppOrderButton
        kind="cart"
        lines={lines}
        total={total}
        countryOverride={countryOverride}
        label="Submit order on WhatsApp"
        customer={form}
        disabled={!ready}
        onDisabledClick={() =>
          setError(
            "Please fill in your name, email, phone, and address before submitting on WhatsApp."
          )
        }
      />
    </div>
  );
}
