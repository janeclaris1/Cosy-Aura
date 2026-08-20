"use client";

import { useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";

const publishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

/** One shared Stripe.js instance — avoids duplicate Embedded Checkout mounts. */
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export function StripeEmbeddedCheckout({
  clientSecret,
}: {
  clientSecret: string;
}) {
  const options = useMemo(() => ({ clientSecret }), [clientSecret]);

  if (!publishableKey || !stripePromise) {
    return (
      <p className="text-sm text-red-600">
        Stripe publishable key is missing. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        in your environment.
      </p>
    );
  }

  return (
    <div className="min-h-[420px]">
      <EmbeddedCheckoutProvider
        key={clientSecret}
        stripe={stripePromise}
        options={options}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
