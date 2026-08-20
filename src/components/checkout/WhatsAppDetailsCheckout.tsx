"use client";

import { useState } from "react";
import { WhatsAppOrderButton } from "@/components/checkout/WhatsAppOrderButton";

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
    <div className="space-y-4">
      <p className="text-sm text-wf-gray">
        Enter your contact and delivery details, then submit on WhatsApp.
      </p>

      <label className="block text-sm">
        Email
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="mt-1 w-full px-3 py-2 border border-wf-border text-sm focus:outline-none focus:border-gold bg-white"
          required
        />
      </label>
      <label className="block text-sm">
        Full name
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="mt-1 w-full px-3 py-2 border border-wf-border text-sm focus:outline-none focus:border-gold bg-white"
          required
        />
      </label>
      <label className="block text-sm">
        Phone
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="mt-1 w-full px-3 py-2 border border-wf-border text-sm focus:outline-none focus:border-gold bg-white"
          required
        />
      </label>
      <label className="block text-sm">
        Address
        <input
          type="text"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="mt-1 w-full px-3 py-2 border border-wf-border text-sm focus:outline-none focus:border-gold bg-white"
          required
        />
      </label>
      <label className="block text-sm">
        City
        <input
          type="text"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          className="mt-1 w-full px-3 py-2 border border-wf-border text-sm focus:outline-none focus:border-gold bg-white"
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
