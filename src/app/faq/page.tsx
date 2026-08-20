import type { Metadata } from "next";
import Link from "next/link";
import { FaqAccordion } from "@/components/content/FaqAccordion";
import { FaqTopicCards } from "@/components/faq/FaqTopicCards";
import { getFaqGalleryImages } from "@/lib/faq-gallery";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to common questions about ordering, shipping, and returns at COSY AURA.",
};

const FAQ_GROUPS = [
  {
    id: "buying",
    title: "Purchasing A Fragrance",
    cta: "Discover More",
    faqs: [
      {
        question: "Are your fragrances brand new?",
        answer:
          "Yes. Every fragrance we sell is brand new and sourced through trusted supply channels. We do not sell pre-owned bottles.",
      },
      {
        question: "Are your perfumes oil-based?",
        answer:
          "Yes. Our fragrances are oil-based perfume oils - alcohol-free formulas that sit close to the skin with rich, long-lasting wear. Available in 30ml, 50ml, and 100ml.",
      },
      {
        question: "Can I reserve a fragrance?",
        answer:
          "Fragrances are sold on a first-come, first-served basis. Adding an item to your cart does not reserve it. Complete checkout to secure your purchase.",
      },
    ],
  },
  {
    id: "shipping",
    title: "Delivery And Tracking",
    cta: "Discover More",
    faqs: [
      {
        question: "When will my fragrance ship?",
        answer:
          "Your order is prepared after payment confirmation. Most orders dispatch within 1 to 3 business days. We deliver Monday to Saturday - pick your preferred delivery date at checkout.",
      },
      {
        question: "Do you ship internationally?",
        answer:
          "We ship worldwide with Aramex, FedEx, and DHL Express. Courier options, live prices, and estimated times appear at checkout for your country.",
      },
      {
        question: "How do I track my order?",
        answer:
          "Use Track Order in the footer or visit /track with your 8-character order number and checkout email. When your order ships, you will also receive an email with carrier tracking details.",
      },
    ],
  },
  {
    id: "payment",
    title: "Payment And Returns",
    cta: "Discover More",
    faqs: [
      {
        question: "What payment methods do you accept?",
        answer:
          "Ghana and Nigeria pay with Paystack (cards, mobile money, bank/USSD). CEMAC countries - Cameroon, Gabon, Congo, Chad, Equatorial Guinea, and Central African Republic - pay with Flutterwave (cards and mobile money in XAF). All other countries pay with Stripe. After payment, a receipt is emailed and sent to the WhatsApp number you enter at checkout.",
      },
      {
        question: "What is your returns policy?",
        answer:
          "You may return an eligible fragrance within 14 days of delivery for a full refund, provided it is unused and in original packaging. See our Returns page for details.",
      },
    ],
  },
];

export default async function FaqPage() {
  const galleryImages = await getFaqGalleryImages();

  return (
    <div id="top" className="font-cantora">
      <section className="relative overflow-hidden border-b border-wf-border bg-gradient-to-br from-wf-light via-white to-[#f3eee4]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(184,134,11,0.18) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
          <p className="text-xs uppercase tracking-[0.25em] text-gold mb-4 animate-fade-up">
            COSY AURA
          </p>
          <h1 className="text-4xl md:text-6xl text-wf-black mb-5 max-w-3xl animate-fade-up [animation-delay:80ms]">
            Frequently Asked Questions
          </h1>
          <p className="text-wf-gray text-base md:text-lg leading-relaxed max-w-xl animate-fade-up [animation-delay:160ms]">
            Find quick answers on buying, payments, shipping, delivery, and returns.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-14 md:py-20">
        <FaqTopicCards
          topics={FAQ_GROUPS.map(({ id, title, cta }) => ({ id, title, cta }))}
          imagePool={galleryImages}
        />
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-16 md:pb-20 space-y-14">
        {FAQ_GROUPS.map((group) => (
          <div key={group.id} id={group.id} className="scroll-mt-28">
            <div className="flex items-center justify-between mb-4 gap-4">
              <h3 className="text-3xl text-wf-black">{group.title}</h3>
              <a
                href="#top"
                className="text-xs uppercase tracking-[0.2em] text-wf-gray hover:text-gold"
              >
                Back To Top
              </a>
            </div>
            <FaqAccordion items={group.faqs} />
          </div>
        ))}
      </section>

      <section className="border-t border-wf-border bg-wf-light">
        <div className="max-w-5xl mx-auto px-4 py-14 md:py-16 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl text-wf-black mb-2">Still need help?</h2>
            <p className="text-sm text-wf-gray">
              Our team can help with product details, delivery timing, and order support.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link href="/contact" className="btn-gold">
              Contact Us
            </Link>
            <Link href="/fragrances" className="btn-outline">
              Browse Fragrances
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
