import type { Metadata } from "next";
import {
  ContentCta,
  ContentPage,
  ContentSection,
} from "@/components/content/ContentPage";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Join the COSY AURA team - roles in ecommerce, customer care, and operations.",
};

const ROLES = [
  {
    title: "Client Advisor",
    type: "Full-time · Remote / Hybrid",
    summary:
      "Guide customers through model selection, answer product questions, and support the purchase journey with care and precision.",
  },
  {
    title: "Operations Specialist",
    type: "Full-time · On-site",
    summary:
      "Coordinate inventory, packing, and dispatch so every fragrance leaves in perfect condition after payment confirmation.",
  },
  {
    title: "Ecommerce Merchandiser",
    type: "Full-time · Remote",
    summary:
      "Shape product presentation, photography standards, and catalogue updates across our luxury brand portfolio.",
  },
];

export default function CareersPage() {
  return (
    <ContentPage
      title="Careers"
      subtitle="Help us build a refined destination for new luxury fragrances - from client care to operations."
    >
      <ContentSection title="Why work with us">
        <p>
          We are a focused luxury ecommerce team that values craftsmanship,
          discretion, and clear communication. If you care about fragrances and
          exceptional service, we&apos;d like to hear from you.
        </p>
      </ContentSection>

      <ContentSection title="Open roles">
        <div className="space-y-4">
          {ROLES.map((role) => (
            <div
              key={role.title}
              className="border border-wf-border p-5 md:p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-2">
                <h3 className="font-playfair text-xl text-wf-black">
                  {role.title}
                </h3>
                <span className="text-xs uppercase tracking-wider text-gold">
                  {role.type}
                </span>
              </div>
              <p className="text-sm text-wf-gray leading-relaxed">
                {role.summary}
              </p>
            </div>
          ))}
        </div>
      </ContentSection>

      <ContentSection title="How to apply">
        <p>
          Send your CV and a short note to{" "}
          <a
            href="mailto:careers@cosyaura.com"
            className="text-gold hover:text-gold-light"
          >
            careers@cosyaura.com
          </a>{" "}
          with the role title in the subject line. We review applications on a
          rolling basis.
        </p>
      </ContentSection>

      <ContentCta href="/contact" label="Get in Touch" />
    </ContentPage>
  );
}
