import { Suspense } from "react";
import Link from "next/link";
import { ClearCartOnSuccess } from "@/components/checkout/ClearCartOnSuccess";
import { FulfillOrderOnSuccess } from "@/components/checkout/FulfillOrderOnSuccess";
import { OpenWhatsAppAfterPay } from "@/components/checkout/OpenWhatsAppAfterPay";

export default function CheckoutSuccessPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <ClearCartOnSuccess />
      <OpenWhatsAppAfterPay />
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="font-playfair text-3xl mb-4">Thank You for Your Order</h1>
      <Suspense>
        <FulfillOrderOnSuccess />
      </Suspense>
      <p className="text-wf-gray mb-8">
        Your payment has been processed successfully. You will receive a confirmation email shortly
        with your order details and tracking information.
      </p>
      <Link href="/fragrances" className="btn-gold">
        Continue Shopping
      </Link>
    </div>
  );
}
