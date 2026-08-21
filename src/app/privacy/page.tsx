import type { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content/ContentPage";

const EFFECTIVE_DATE = "August 21, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Cosy Aura collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <ContentPage
      title="Security and Privacy Guaranteed"
      subtitle="We are committed to protecting your privacy. Personal information you share with Cosy Aura is used to process your orders and support your experience — never sold for marketing lists."
    >
      <p className="text-sm text-black/60 mb-10">
        Effective date: <span className="text-black font-medium">{EFFECTIVE_DATE}</span>
      </p>

      <ContentSection title="Our commitment to you">
        <p>
          Cosy Aura respects your privacy. We use the personal information you
          provide only to process and fulfill your orders, communicate about
          deliveries and support, and improve our storefront. We do not sell
          your personal information for money.
        </p>
        <p>
          All transactions on cosyaura.com are protected with industry-standard
          Secure Socket Layer (SSL) encryption. Payment card details are handled
          by our payment partners (such as Paystack, Flutterwave, and Stripe) —
          we do not store full card numbers on our servers.
        </p>
        <p>
          If you have questions about your data, or wish to access, correct, or
          request deletion of personal information we hold about you, contact{" "}
          <a href="mailto:support@cosyaura.com">support@cosyaura.com</a>.
        </p>
      </ContentSection>

      <ContentSection title="Information we collect">
        <p>
          When you browse, create an account, or place an order, we may collect
          your name, email address, phone number, shipping address, order
          history, and messages you send to our team. We also collect limited
          technical data such as IP address, device type, and browser information
          to keep the site secure and reliable.
        </p>
        <p>
          We use cookies and similar technologies for essential store functions
          (cart, login, security) and, where permitted, to understand how
          visitors use the site and measure marketing performance. You can manage
          non-essential cookies through our cookie banner and your browser
          settings.
        </p>
      </ContentSection>

      <ContentSection title="How we use and share information">
        <p>
          We use your information to create accounts, process payments, pack and
          ship orders, send order confirmations and tracking updates, prevent
          fraud, and respond to support requests. We may send marketing emails
          only where you have opted in or where the law allows — you can
          unsubscribe at any time.
        </p>
        <p>
          We share personal information only with trusted service providers who
          help us operate: payment processors, email and messaging providers,
          hosting and security vendors, and shipping or logistics partners needed
          to deliver your order. We may also disclose information when required
          by law or to protect rights and safety.
        </p>
      </ContentSection>

      <ContentSection title="Information for customers outside Ghana and Cameroon">
        <p>
          Cosy Aura serves customers internationally. If you place an order from
          outside Ghana or Cameroon, your personal information may be processed
          in countries where we or our service providers operate, including for
          payment and delivery. By placing an order, you consent to this transfer
          as needed to fulfill your purchase and provide support.
        </p>
        <p>
          Depending on where you live, you may have rights to access, correct,
          delete, or restrict certain processing of your data, or to lodge a
          complaint with a data protection authority. Email{" "}
          <a href="mailto:support@cosyaura.com">support@cosyaura.com</a> to
          exercise these rights. We may need to verify your identity before
          completing a request.
        </p>
      </ContentSection>

      <ContentSection title="Payment partners">
        <p>
          To offer secure checkout, we share necessary order and customer details
          with payment providers such as Paystack (Ghana and Nigeria), Flutterwave
          (CEMAC), and Stripe (other markets). Their handling of your payment
          data is governed by their own privacy notices in addition to this
          policy.
        </p>
      </ContentSection>

      <ContentSection title="Retention, security, and children">
        <p>
          We keep personal information only as long as needed for orders,
          accounting, legal, and support purposes. We use technical and
          organizational measures designed to protect your data, but no online
          transmission is completely risk-free.
        </p>
        <p>
          This website is not directed to children under 13, and we do not
          knowingly collect personal information from children under 13.
        </p>
      </ContentSection>

      <ContentSection title="Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. Changes take
          effect when posted on this page unless we state otherwise. Continued
          use of cosyaura.com after an update means you accept the revised
          policy.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
