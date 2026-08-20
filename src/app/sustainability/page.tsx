import type { Metadata } from "next";
import {
  ContentCta,
  ContentPage,
  ContentSection,
} from "@/components/content/ContentPage";

export const metadata: Metadata = {
  title: "Sustainability",
  description:
    "How COSY AURA approaches alcohol-free oil-based perfume oils, responsible packaging, and long-life luxury fragrances.",
};

const PILLARS = [
  {
    title: "Built to last",
    body: "Oil-based perfume oils are meant to be savored over time. Choosing a well-made bottle is an investment in lasting enjoyment over disposable fashion scents.",
  },
  {
    title: "Responsible packaging",
    body: "We use protective materials sized for the product, minimize excess filler, and prefer recyclable outer cartons where practical.",
  },
  {
    title: "Efficient logistics",
    body: "Consolidated dispatch and tracked carriers help reduce failed deliveries and unnecessary reships.",
  },
];

export default function SustainabilityPage() {
  return (
    <ContentPage
      title="Sustainability"
      subtitle="Luxury should last. We focus on oil-based, alcohol-free perfume oils, careful packing, and a purchase process that avoids wasteful false starts."
    >
      <ContentSection title="Our approach">
        <p>
          Our fragrances are oil-based - alcohol-free perfume oils meant to be
          savored on skin over time. Choosing a well-made bottle is an investment
          in lasting enjoyment over disposable fashion scents.
        </p>
      </ContentSection>

      <ContentSection>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {PILLARS.map((p) => (
            <div key={p.title} className="bg-wf-light p-5 md:p-6">
              <h3 className="font-playfair text-lg text-wf-black mb-2">
                {p.title}
              </h3>
              <p className="text-sm text-wf-gray leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </ContentSection>

      <ContentSection title="Continuous improvement">
        <p>
          We review packaging suppliers and carrier partners regularly to reduce
          waste and improve delivery success rates. Suggestions are welcome via
          our{" "}
          <a href="/contact" className="text-gold hover:text-gold-light">
            contact form
          </a>
          .
        </p>
      </ContentSection>

      <ContentCta />
    </ContentPage>
  );
}
