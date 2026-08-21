import type { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content/ContentPage";

const EFFECTIVE_DATE = "August 21, 2026";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "Terms that govern your use of cosyaura.com and purchases from Cosy Aura.",
};

export default function TermsPage() {
  return (
    <ContentPage
      title="Terms and Conditions"
      subtitle="These Terms and Conditions govern your access to cosyaura.com and your purchase of Cosy Aura perfume oils. By using this website or placing an order, you agree to these terms."
    >
      <p className="text-sm text-black/60 mb-10">
        Effective date: <span className="text-black font-medium">{EFFECTIVE_DATE}</span>
      </p>

      <ContentSection title="Agreement to terms">
        <p>
          By browsing this website or completing a purchase, you agree to these
          Terms and Conditions and our{" "}
          <a href="/privacy">Privacy Policy</a>. If you do not agree, please do
          not use this website.
        </p>
      </ContentSection>

      <ContentSection title="Eligibility and your account">
        <p>
          You must be legally able to enter a binding contract and must provide
          accurate, current information at checkout and in any account you create.
          You are responsible for keeping login details secure and for activity
          under your account.
        </p>
      </ContentSection>

      <ContentSection title="Products and availability">
        <p>
          Cosy Aura sells alcohol-free perfume oils. We work hard to describe
          products accurately, including size, notes, and availability. Images are
          for illustration; slight differences in display are possible. Stock can
          change quickly — we may correct errors, update listings, or cancel an
          order when an item cannot be fulfilled, with a refund of amounts paid
          for that item.
        </p>
      </ContentSection>

      <ContentSection title="Pricing, taxes, and payment">
        <p>
          Prices are shown in the currency selected on the site or at checkout.
          Applicable taxes, duties, and fees may apply depending on destination.
          Payment is processed by third-party providers (including Paystack,
          Flutterwave, and Stripe). We do not store full payment card numbers.
        </p>
        <p>
          We may refuse, cancel, or limit orders where we detect fraud risk,
          pricing errors, compliance concerns, or stock issues.
        </p>
      </ContentSection>

      <ContentSection title="Shipping and delivery">
        <p>
          Orders are prepared after payment confirmation. Delivery options,
          estimates, and fees are shown at checkout. Timelines are estimates and
          may be affected by carriers, customs, weather, or events outside our
          reasonable control.
        </p>
        <p>
          You are responsible for providing a correct delivery address and for
          receiving the package. Risk of loss generally transfers when the
          package is delivered to the address you provided. See our{" "}
          <a href="/shipping">Shipping</a> page for more detail.
        </p>
      </ContentSection>

      <ContentSection title="Returns, cancellations, and refunds">
        <p>
          Returns and refunds are governed by our{" "}
          <a href="/returns">Trial &amp; Return</a> policy. Time limits,
          condition requirements, and eligibility rules apply. We may decline
          returns that do not meet that policy.
        </p>
      </ContentSection>

      <ContentSection title="Acceptable use">
        <p>
          You may not use this website to break the law, infringe others&apos;
          rights, attempt unauthorized access to our systems, disrupt the site,
          or scrape content without written permission.
        </p>
      </ContentSection>

      <ContentSection title="Intellectual property">
        <p>
          Website content — including text, graphics, logos, product photography,
          and software — is owned by or licensed to Cosy Aura and protected by
          intellectual property laws. No license is granted except as expressly
          stated.
        </p>
      </ContentSection>

      <ContentSection title="Disclaimer and limitation of liability">
        <p>
          To the fullest extent permitted by law, this website and our services
          are provided &quot;as is&quot; and &quot;as available.&quot; We disclaim
          implied warranties including merchantability and fitness for a
          particular purpose.
        </p>
        <p>
          To the maximum extent permitted by law, Cosy Aura is not liable for
          indirect, incidental, consequential, or special damages. Our total
          liability for any claim related to a purchase is limited to the amount
          you paid for that order.
        </p>
      </ContentSection>

      <ContentSection title="Governing law">
        <p>
          These terms are governed by applicable law in the jurisdictions where
          Cosy Aura operates, including Ghana and Cameroon for local fulfillment,
          without regard to conflict-of-law rules that would require another
          forum, except where mandatory consumer law says otherwise.
        </p>
      </ContentSection>

      <ContentSection title="Changes and contact">
        <p>
          We may update these Terms and Conditions at any time. Updated terms
          take effect when posted. Continued use of the website after changes
          means you accept the revised terms.
        </p>
        <p>
          Questions? Email{" "}
          <a href="mailto:support@cosyaura.com">support@cosyaura.com</a>.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
