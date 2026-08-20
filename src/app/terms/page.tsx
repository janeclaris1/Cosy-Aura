import type { Metadata } from "next";
import Image from "next/image";
import { ContentSection } from "@/components/content/ContentPage";

const EFFECTIVE_DATE = "August 4, 2026";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "Legal terms that govern purchases and use of COSY AURA.",
};

export default function TermsPage() {
  return (
    <div>
      <section className="relative border-b border-wf-border overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1541643600914-78b084683601?w=1600&h=900&fit=crop"
          alt="Luxury perfume bottle background"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/45" aria-hidden />
        <div className="relative max-w-4xl mx-auto px-4 py-20 md:py-28">
          <h1 className="text-4xl md:text-5xl text-white mb-4">Terms and Conditions</h1>
          <p className="text-white/90 text-base md:text-lg leading-relaxed max-w-2xl">
            These Terms and Conditions govern your access to this website and your purchase of products from COSY AURA.
          </p>
        </div>
      </section>
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
      <p className="text-sm text-wf-gray mb-8">
        Effective date: <span className="text-wf-black">{EFFECTIVE_DATE}</span>
      </p>

      <ContentSection title="1. Agreement to terms">
        <p>
          By accessing this website or placing an order, you agree to these Terms
          and Conditions and our Privacy Policy. If you do not agree, do not use
          this website.
        </p>
      </ContentSection>

      <ContentSection title="2. Eligibility and account responsibility">
        <ul className="list-disc pl-5 space-y-2">
          <li>You must be legally capable of entering binding contracts.</li>
          <li>You must provide accurate and current information.</li>
          <li>
            You are responsible for account credentials and activity under your
            account.
          </li>
        </ul>
      </ContentSection>

      <ContentSection title="3. Product listings and availability">
        <p>
          We make reasonable efforts to describe products accurately, including
          specifications, availability, and pricing. Product images are for
          illustration and may vary slightly due to display settings.
        </p>
        <p>
          We reserve the right to correct errors, update information, and modify
          listings at any time without prior notice.
        </p>
      </ContentSection>

      <ContentSection title="4. Pricing, taxes, and payment">
        <ul className="list-disc pl-5 space-y-2">
          <li>Prices are shown in USD unless otherwise stated.</li>
          <li>Applicable taxes, duties, and fees may apply depending on destination.</li>
          <li>
            Payment is processed by third-party providers. We do not store full
            payment card details.
          </li>
          <li>
            We may refuse, cancel, or limit orders where fraud risk, pricing error,
            compliance concerns, or stock issues exist.
          </li>
        </ul>
      </ContentSection>

      <ContentSection title="5. Shipping and fulfillment by partners">
        <p>
          All products listed on this website are fulfilled and shipped through our
          logistics and distribution partners. Shipping timelines are estimates only.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Risk of delay due to customs, weather, carrier operations, or force
            majeure events is outside our reasonable control.
          </li>
          <li>
            Title and risk of loss transfer to the customer when the package is
            delivered to the shipping address or authorized drop point.
          </li>
          <li>
            Customers are responsible for accurate delivery information and for
            receiving the package, including signature where required.
          </li>
        </ul>
      </ContentSection>

      <ContentSection title="6. Returns, cancellations, and refunds">
        <p>
          Returns and refunds are governed by our Returns Policy. Eligibility,
          condition requirements, and time windows apply. We may refuse returns
          that do not satisfy policy requirements.
        </p>
      </ContentSection>

      <ContentSection title="7. Prohibited use">
        <p>You may not use this website to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Violate law, regulation, or third-party rights.</li>
          <li>Attempt unauthorized access to systems or data.</li>
          <li>Interfere with website operation, security, or integrity.</li>
          <li>Scrape content or data without written permission.</li>
        </ul>
      </ContentSection>

      <ContentSection title="8. Intellectual property">
        <p>
          All website content, including text, graphics, logos, design, and software,
          is owned by or licensed to COSY AURA and protected by
          intellectual property laws. No rights are granted except as expressly
          stated.
        </p>
      </ContentSection>

      <ContentSection title="9. Disclaimer of warranties">
        <p>
          This website and all services are provided on an “as is” and “as available”
          basis to the maximum extent permitted by law. We disclaim all warranties,
          express or implied, including implied warranties of merchantability, fitness
          for a particular purpose, and non-infringement.
        </p>
      </ContentSection>

      <ContentSection title="10. Limitation of liability">
        <p>
          To the maximum extent permitted by law, COSY AURA, its owners,
          employees, affiliates, and partners are not liable for any indirect,
          incidental, consequential, special, punitive, or exemplary damages,
          including lost profits, lost data, or business interruption.
        </p>
        <p>
          Our total aggregate liability for any claim arising from or related to
          your use of this website or a purchase is limited to the amount paid by
          you for the specific order giving rise to the claim.
        </p>
      </ContentSection>

      <ContentSection title="11. Indemnification">
        <p>
          You agree to defend, indemnify, and hold harmless COSY AURA
          and its affiliates, officers, employees, and partners from and against
          claims, losses, liabilities, costs, and expenses, including reasonable
          legal fees, arising out of your breach of these terms, misuse of this
          website, or violation of law or third-party rights.
        </p>
      </ContentSection>

      <ContentSection title="12. Compliance and export controls">
        <p>
          You are responsible for compliance with local laws related to import,
          customs, sanctions, and product restrictions in your destination country.
          We may refuse orders that create legal or sanctions risk.
        </p>
      </ContentSection>

      <ContentSection title="13. Governing law and dispute resolution">
        <p>
          These terms are governed by the laws of the State of Wyoming, United States,
          without regard to conflict of law principles.
        </p>
        <p>
          Any dispute arising from these terms or your use of this website shall be
          resolved exclusively in courts located in Wyoming, unless mandatory law
          requires otherwise.
        </p>
      </ContentSection>

      <ContentSection title="14. Changes to terms">
        <p>
          We may update these Terms and Conditions at any time. Updated terms become
          effective upon posting. Continued use of the website after updates indicates
          acceptance of revised terms.
        </p>
      </ContentSection>

      <ContentSection title="15. Contact">
        <p>
          For legal notices or questions about these terms, contact{" "}
          <a href="mailto:support@cosyaura.com" className="text-gold hover:text-gold-light">
            support@cosyaura.com
          </a>
          .
        </p>
      </ContentSection>
      </section>
    </div>
  );
}
