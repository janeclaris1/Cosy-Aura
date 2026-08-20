import type { Metadata } from "next";
import { TrackOrderForm } from "@/components/orders/TrackOrderForm";

export const metadata: Metadata = {
  title: "Track Your Order",
  description:
    "Track your COSY AURA fragrance order status and shipment using your order number and email.",
};

export default function TrackOrderPage({
  searchParams,
}: {
  searchParams?: { ref?: string; email?: string };
}) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
      <h1 className="font-playfair text-3xl md:text-4xl mb-3">Track your order</h1>
      <p className="text-wf-gray max-w-2xl mb-10">
        Enter the order number from your confirmation email and the email address
        used at checkout to see status and shipment tracking.
      </p>
      <TrackOrderForm
        initialRef={searchParams?.ref || ""}
        initialEmail={searchParams?.email || ""}
      />
    </div>
  );
}
