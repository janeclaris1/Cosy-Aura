import type { Metadata } from "next";
import { SubscriptionPlans } from "@/components/perfume/SubscriptionPlans";
import { absoluteUrl, defaultOgImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Fragrance Subscription",
  description: "Monthly discovery sets - curated samples delivered to your door.",
  alternates: { canonical: absoluteUrl("/subscribe") },
  openGraph: {
    title: "Fragrance Subscription | COSY AURA",
    description: "Monthly perfume discovery sets.",
    url: absoluteUrl("/subscribe"),
    images: [defaultOgImage()],
  },
};

export default function SubscribePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
      <p className="text-xs uppercase tracking-[0.14em] text-gold mb-2">
        Subscription Service
      </p>
      <h1 className="font-playfair text-3xl md:text-4xl mb-3">
        Monthly discovery sets
      </h1>
      <p className="text-sm text-wf-gray mb-10 max-w-2xl">
        Try before you commit to a full bottle. Pause anytime. Pair with your
        scent profile for sharper curation.
      </p>
      <SubscriptionPlans />
    </div>
  );
}
