import type { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content/ContentPage";

const EFFECTIVE_DATE = "August 4, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How COSY AURA collects, uses, stores, and shares personal information.",
};

export default function PrivacyPage() {
  return (
    <ContentPage
      title="Privacy Policy"
      subtitle="This Privacy Policy describes how COSY AURA handles personal information when you use this website."
    >
      <p className="text-sm text-wf-gray mb-8">
        Effective date: <span className="text-wf-black">{EFFECTIVE_DATE}</span>
      </p>

      <ContentSection title="1. Who controls your information">
        <p>
          COSY AURA controls the personal information collected
          through this website. References to “we”, “our”, and “us” in this
          policy mean COSY AURA.
        </p>
        <p>
          Contact:{" "}
          <a href="mailto:support@cosyaura.com" className="text-gold hover:text-gold-light">
            support@cosyaura.com
          </a>
        </p>
      </ContentSection>

      <ContentSection title="2. Information we collect">
        <ul className="list-disc pl-5 space-y-2">
          <li>Account details such as name, email address, and login information.</li>
          <li>Order details such as products purchased, pricing, and order history.</li>
          <li>
            Checkout details such as shipping name, address, phone, and courier
            selection.
          </li>
          <li>
            Payment references from payment processors. We do not store full
            payment card numbers.
          </li>
          <li>Messages and requests sent through contact forms or email.</li>
          <li>
            Technical data such as IP address, device type, browser, operating
            system, and usage analytics.
          </li>
          <li>Cookie and consent preference information.</li>
        </ul>
      </ContentSection>

      <ContentSection title="3. How we use personal information">
        <ul className="list-disc pl-5 space-y-2">
          <li>To create and manage customer accounts.</li>
          <li>To process orders, payments, shipping, returns, and refunds.</li>
          <li>To send transactional communications about orders and support.</li>
          <li>To detect, prevent, and investigate fraud or abuse.</li>
          <li>To improve website performance, products, and customer experience.</li>
          <li>To comply with legal obligations and enforce our terms.</li>
          <li>
            To send marketing updates where consent is provided or where permitted
            by law.
          </li>
        </ul>
      </ContentSection>

      <ContentSection title="4. Legal bases for processing">
        <p>Depending on your location, we process data based on one or more of the following:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Performance of a contract, including order fulfillment and support.</li>
          <li>Legitimate interests, including security, analytics, and operations.</li>
          <li>Consent, including optional cookies and marketing communications.</li>
          <li>Legal obligations, including tax, accounting, and regulatory duties.</li>
        </ul>
      </ContentSection>

      <ContentSection title="5. Cookies and tracking technologies">
        <p>
          We use essential cookies required for security, cart functions, and
          checkout. We may also use analytics or marketing cookies where consent
          is required. You can manage cookie preferences through our cookie
          banner and browser settings.
        </p>
      </ContentSection>

      <ContentSection title="6. Sharing personal information">
        <p>We may share personal information with trusted service providers, including:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Payment processors and fraud prevention providers.</li>
          <li>Email and communication providers.</li>
          <li>Hosting, infrastructure, analytics, and security vendors.</li>
          <li>Shipping and logistics partners needed to fulfill your order.</li>
        </ul>
        <p>
          We may also disclose information where required by law, court order,
          or to protect legal rights, safety, or security. We do not sell personal
          information for money.
        </p>
      </ContentSection>

      <ContentSection title="7. International transfers">
        <p>
          Your information may be transferred to and processed in countries other
          than your own. Where applicable, we use reasonable safeguards for
          cross-border data transfers in accordance with relevant law.
        </p>
      </ContentSection>

      <ContentSection title="8. Data retention">
        <p>
          We retain personal information for as long as necessary for the purposes
          described in this policy, including legal, accounting, tax, dispute,
          and enforcement needs. Retention periods vary by data category and legal
          requirements.
        </p>
      </ContentSection>

      <ContentSection title="9. Security">
        <p>
          We use technical and organizational measures designed to protect personal
          information. No method of transmission or storage is fully secure, and
          we cannot guarantee absolute security.
        </p>
      </ContentSection>

      <ContentSection title="10. Your rights">
        <p>Depending on applicable law, you may have rights to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Access or receive a copy of your personal information.</li>
          <li>Request correction of inaccurate information.</li>
          <li>Request deletion of certain information.</li>
          <li>Object to certain processing or request restriction.</li>
          <li>Withdraw consent where processing is based on consent.</li>
          <li>Request data portability where applicable.</li>
          <li>Lodge a complaint with a relevant data protection authority.</li>
        </ul>
        <p>
          To exercise rights, contact{" "}
          <a href="mailto:support@cosyaura.com" className="text-gold hover:text-gold-light">
            support@cosyaura.com
          </a>
          . We may request identity verification before completing requests.
        </p>
      </ContentSection>

      <ContentSection title="11. Children's privacy">
        <p>
          This website is not directed to children under 13, and we do not knowingly
          collect personal information from children under 13.
        </p>
      </ContentSection>

      <ContentSection title="12. Third-party links and services">
        <p>
          This website may contain links to third-party websites and services.
          Their privacy practices are governed by their own policies, not this one.
        </p>
      </ContentSection>

      <ContentSection title="13. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. Changes become
          effective when posted on this page, unless otherwise stated.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
