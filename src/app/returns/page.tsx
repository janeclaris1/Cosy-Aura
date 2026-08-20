import type { Metadata } from "next";
import {
  ContentCta,
  ContentPage,
  ContentSection,
} from "@/components/content/ContentPage";

export const metadata: Metadata = {
  title: "Trial & Return",
  description:
    "14-day trial & return policy for new luxury fragrances purchased from COSY AURA.",
};

export default function ReturnsPage() {
  return (
    <ContentPage
      title="Trial & Return"
      subtitle="Not completely satisfied? Eligible fragrances can be returned within 14 days of delivery."
    >
      <ContentSection title="14-day trial & return">
        <p>
          If your purchase isn&apos;t right for you, you may return it within{" "}
          <strong className="text-wf-black">14 days of delivery</strong> for a
          full refund of the fragrance price, provided the conditions below are met.
        </p>
      </ContentSection>

      <ContentSection title="Eligibility">
        <ul className="list-disc pl-5 space-y-2">
          <li>Fragrance is unused and in the same condition as received</li>
          <li>Original packaging, tags, and all included accessories are returned</li>
          <li>Return request is submitted within 14 days of delivery</li>
          <li>Proof of purchase (order confirmation) is provided</li>
        </ul>
      </ContentSection>

      <ContentSection title="How to start a return">
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Contact us via the{" "}
            <a href="/contact" className="text-gold hover:text-gold-light">
              Contact
            </a>{" "}
            page with your order number and reason for return.
          </li>
          <li>We will confirm eligibility and share return instructions.</li>
          <li>
            Ship the fragrance using a tracked service. Keep your tracking receipt
            until the refund is complete.
          </li>
          <li>
            Once we inspect and approve the return, your refund is issued to
            the original payment method.
          </li>
        </ol>
      </ContentSection>

      <ContentSection title="Refunds">
        <p>
          Refunds are typically processed within 5-10 business days after we
          receive and approve the returned fragrance. Shipping costs on the original
          order are non-refundable unless the return is due to our error.
        </p>
      </ContentSection>

      <ContentCta href="/contact" label="Start a Return" />
    </ContentPage>
  );
}
