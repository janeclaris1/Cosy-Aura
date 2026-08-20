"use client";

import { useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/store";
import { useLocaleStore } from "@/lib/locale-store";
import { formatPrice } from "@/lib/utils";
import { SAMPLE_SIZE_ML, sampleSalePrice } from "@/lib/pricing";
import {
  DISCOVERY_BUNDLE_DISCOUNT,
  DISCOVERY_BUNDLE_MIN_SAMPLES,
  SUBSCRIPTION_PLANS,
  subscriptionPlanPriceGhs,
  type SubscriptionPlanId,
} from "@/lib/discovery-bundle";
import { useRegionalPrice } from "@/lib/use-regional-price";
import { useMemberDiscount } from "@/lib/use-member-discount";

type SampleFragrance = {
  id: string;
  slug: string;
  model: string;
  brand: { name: string };
  images: { url: string }[];
};

function PlanPrice({ samples }: { samples: number }) {
  const currency = useLocaleStore((s) => s.currency);
  useLocaleStore((s) => s.rates);
  const member = useMemberDiscount();
  const price = member.apply(useRegionalPrice(subscriptionPlanPriceGhs(samples)));
  return (
    <>
      <p className="font-playfair text-2xl text-gold">
        {formatPrice(price, currency)}
      </p>
      {samples >= DISCOVERY_BUNDLE_MIN_SAMPLES ? (
        <p className="text-[11px] text-mocha mt-1">
          Includes {Math.round(DISCOVERY_BUNDLE_DISCOUNT * 100)}% bundle discount
        </p>
      ) : null}
    </>
  );
}

export function SubscriptionPlans() {
  const addItem = useCartStore((s) => s.addItem);
  const currency = useLocaleStore((s) => s.currency);
  useLocaleStore((s) => s.rates);
  const member = useMemberDiscount();
  const sampleUnit = useRegionalPrice(sampleSalePrice());
  const [selected, setSelected] = useState<SubscriptionPlanId>("discovery-5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === selected)!;
  const displayPrice = member.apply(
    useRegionalPrice(subscriptionPlanPriceGhs(plan.samples))
  );

  async function subscribe() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/fragrances/samples?limit=${plan.samples}`
      );
      const data = await res.json();
      const samples = (data.fragrances || []) as SampleFragrance[];

      if (samples.length < plan.samples) {
        setError(
          "Not enough sample fragrances in stock right now. Try the discovery set on a product page, or contact us."
        );
        setLoading(false);
        return;
      }

      samples.slice(0, plan.samples).forEach((item) => {
        addItem({
          fragranceId: item.id,
          slug: item.slug,
          brand: item.brand.name,
          model: `${item.model} · ${SAMPLE_SIZE_ML}ml sample · ${plan.name}`,
          price: sampleUnit,
          image: item.images[0]?.url || "/images/placeholders/fragrance.svg",
          bottleSize: SAMPLE_SIZE_ML,
        });
      });
    } catch {
      setError("Could not start this plan. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {SUBSCRIPTION_PLANS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelected(p.id)}
            className={`text-left p-5 border transition-colors ${
              selected === p.id
                ? "border-gold bg-highlight/15"
                : "border-wf-border hover:border-gold"
            }`}
          >
            <p className="text-xs uppercase tracking-wider text-gold mb-2">
              {p.samples} samples / month
            </p>
            <h3 className="font-playfair text-2xl mb-2">{p.name}</h3>
            <p className="text-sm text-wf-gray mb-4">{p.blurb}</p>
            <PlanPrice samples={p.samples} />
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <button
          type="button"
          onClick={subscribe}
          disabled={loading}
          className="btn-gold disabled:opacity-50"
        >
          {loading ? "Adding samples…" : `Start ${plan.name}`}
        </button>
        <Link href="/scent-profile" className="btn-outline">
          Build scent profile first
        </Link>
        <p className="text-xs text-wf-gray w-full md:w-auto">
          Adds {plan.samples} real 2ml samples to your cart (
          {formatPrice(displayPrice, currency)}). Message us anytime to refresh
          next month&apos;s set.
        </p>
      </div>
      {error ? <p className="text-sm text-red-600 mt-3">{error}</p> : null}
    </div>
  );
}
