import type { Metadata } from "next";
import {
  ContentCta,
  ContentPage,
  ContentSection,
} from "@/components/content/ContentPage";
import { getActiveShippingMethods } from "@/lib/shipping-methods";

export const metadata: Metadata = {
  title: "Shipping",
  description:
    "How Cosy Aura packs and delivers perfume oils after payment confirmation.",
};

export const dynamic = "force-dynamic";

export default async function ShippingPage() {
  const methods = await getActiveShippingMethods();

  return (
    <ContentPage
      title="Shipping Information"
      subtitle="We are committed to getting your Cosy Aura oils to you safely and on time. Every order is packed with care and leaves our hands only after payment is confirmed."
    >
      <ContentSection title="How shipping works">
        <p>
          Once your payment is confirmed, our team prepares your order for
          dispatch. Bottles are packed in protective materials suited to perfume
          oils and sent with tracking wherever the carrier provides it.
        </p>
        <p>
          Most orders ship within <strong>1–3 business days</strong>. We deliver{" "}
          <strong>Monday to Saturday</strong> — you can choose a preferred
          delivery date at checkout when that option is available. Final timing
          depends on your destination and the service you select.
        </p>
      </ContentSection>

      <ContentSection title="Delivery options">
        <p>
          Available methods and prices are shown at checkout for your country.
          Current options include:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          {methods.length > 0 ? (
            methods.map((method) => (
              <li key={method.id}>
                <strong>{method.name}</strong>
                {method.description ? (
                  <span className="text-wf-gray">: {method.description}</span>
                ) : null}
                {method.price === 0 ? (
                  <span className="text-wf-gray"> (free)</span>
                ) : null}
              </li>
            ))
          ) : (
            <li>
              Delivery options for your region appear at checkout after you select
              your country and address.
            </li>
          )}
        </ul>
        <p>
          Duties, taxes, and customs clearance on international orders (if any)
          are the buyer&apos;s responsibility unless we state otherwise at
          checkout.
        </p>
      </ContentSection>

      <ContentSection title="Ghana and Cameroon">
        <p>
          We fulfil from Ghana and Cameroon, with shop locations in Accra,
          Yaoundé, and Mamfe.           Local and regional delivery options — including shop pickup in Accra,
          Yaoundé, and Mamfe, plus courier partners where available — are offered
          at checkout based on your address.
        </p>
      </ContentSection>

      <ContentSection title="Packaging and security">
        <p>
          Orders ship in discreet outer packaging. Signature may be required on
          delivery for higher-value orders. Please ensure someone can receive the
          package at the address you provide.
        </p>
      </ContentSection>

      <ContentSection title="Tracking your shipment">
        <p>
          When your order ships, we send tracking details to the email (and
          WhatsApp, when provided) used at checkout. You can also use our{" "}
          <a href="/track">Track Order</a> page with your order number and
          checkout email anytime.
        </p>
      </ContentSection>

      <ContentCta label="Shop Fragrances" />
    </ContentPage>
  );
}
