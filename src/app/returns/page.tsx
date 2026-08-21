import type { Metadata } from "next";
import {
  ContentCta,
  ContentPage,
  ContentSection,
} from "@/components/content/ContentPage";

export const metadata: Metadata = {
  title: "Trial & Return",
  description:
    "14-day trial and return policy for Cosy Aura perfume oils.",
};

export default function ReturnsPage() {
  return (
    <ContentPage
      title="Trial & Return"
      subtitle="We want you to feel confident ordering Cosy Aura oils online. If your purchase is not right for you, eligible orders can be returned within 14 days of delivery for a full refund of the product price."
    >
      <ContentSection title="Our 14-day promise">
        <p>
          You may return an eligible fragrance within{" "}
          <strong>14 days of delivery</strong> for a full refund of the fragrance
          price, provided the conditions below are met. We are committed to a
          fair, straightforward return process.
        </p>
      </ContentSection>

      <ContentSection title="Eligibility">
        <p>To qualify for a return, the following must be true:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>The oil is unused and in the same condition as received.</li>
          <li>
            Original packaging and all included accessories are returned with the
            product.
          </li>
          <li>Your return request is submitted within 14 days of delivery.</li>
          <li>You can provide proof of purchase (order confirmation or number).</li>
        </ul>
      </ContentSection>

      <ContentSection title="How to start a return">
        <p>Follow these steps:</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Contact us via the <a href="/contact">Contact</a> page with your
            order number and reason for return.
          </li>
          <li>We will confirm eligibility and share return instructions.</li>
          <li>
            Ship the item with a tracked service and keep your tracking receipt
            until the refund is complete.
          </li>
          <li>
            After we inspect and approve the return, your refund is issued to the
            original payment method.
          </li>
        </ol>
      </ContentSection>

      <ContentSection title="Refunds">
        <p>
          Refunds are typically processed within <strong>5–10 business days</strong>{" "}
          after we receive and approve the returned item. Original shipping costs
          are non-refundable unless the return is due to our error (wrong item,
          damage in transit caused by inadequate packing on our side, or a
          defective product).
        </p>
      </ContentSection>

      <ContentSection title="Questions">
        <p>
          Email <a href="mailto:support@cosyaura.com">support@cosyaura.com</a>{" "}
          if you need help with a return. We are here to make it simple.
        </p>
      </ContentSection>

      <ContentCta href="/contact" label="Start a Return" />
    </ContentPage>
  );
}
