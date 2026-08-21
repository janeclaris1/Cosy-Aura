import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ContentCta,
  ContentPage,
  ContentSection,
} from "@/components/content/ContentPage";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to common questions about Cosy Aura perfume oils, shipping, payments, and returns.",
};

const FAQ_SECTIONS: { title: string; items: { q: string; a: ReactNode }[] }[] = [
  {
    title: "Purchasing a fragrance",
    items: [
      {
        q: "Are your fragrances brand new?",
        a: "Yes. Every Cosy Aura oil we sell is brand new and sourced through trusted channels. We do not sell pre-owned bottles.",
      },
      {
        q: "Are your perfumes oil-based?",
        a: "Yes. Our fragrances are alcohol-free perfume oils that sit close to the skin with rich, long-lasting wear. They are available in 30ml, 50ml, and 100ml.",
      },
      {
        q: "Can I reserve a fragrance?",
        a: "Fragrances are sold on a first-come, first-served basis. Adding an item to your cart does not reserve it. Complete checkout to secure your purchase.",
      },
    ],
  },
  {
    title: "Delivery and tracking",
    items: [
      {
        q: "When will my order ship?",
        a: "Your order is prepared after payment confirmation. Most orders dispatch within 1 to 3 business days. We deliver Monday to Saturday — pick your preferred delivery date at checkout when available.",
      },
      {
        q: "Do you ship internationally?",
        a: (
          <>
            Yes. Courier options, live prices, and estimated times appear at
            checkout for your country. See our{" "}
            <a href="/shipping">Shipping</a> page for more detail.
          </>
        ),
      },
      {
        q: "How do I track my order?",
        a: (
          <>
            Use <a href="/track">Track Order</a> with your order number and
            checkout email. When your order ships, you will also receive an email
            with carrier tracking details.
          </>
        ),
      },
    ],
  },
  {
    title: "Payment and returns",
    items: [
      {
        q: "What payment methods do you accept?",
        a: "Ghana and Nigeria pay with Paystack (cards, mobile money, bank/USSD). CEMAC countries — Cameroon, Gabon, Congo, Chad, Equatorial Guinea, and Central African Republic — pay with Flutterwave (cards and mobile money in XAF). Other markets pay with Stripe. After payment, a receipt is emailed and, when you provide a WhatsApp number at checkout, sent there as well.",
      },
      {
        q: "What is your returns policy?",
        a: (
          <>
            You may return an eligible fragrance within 14 days of delivery for a
            full refund of the product price, provided it is unused and in
            original packaging. Full details are on our{" "}
            <a href="/returns">Trial &amp; Return</a> page.
          </>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <ContentPage
      title="Frequently Asked Questions"
      subtitle="Clear answers about buying Cosy Aura oils, payments, shipping, tracking, and returns. If you need more help, our team is ready at support@cosyaura.com."
    >
      {FAQ_SECTIONS.map((section) => (
        <ContentSection key={section.title} title={section.title}>
          {section.items.map((item) => (
            <div key={item.q} className="space-y-2">
              <p className="font-semibold text-black">{item.q}</p>
              <p>{item.a}</p>
            </div>
          ))}
        </ContentSection>
      ))}

      <ContentSection title="Still need help?">
        <p>
          Our team can help with product details, delivery timing, and order
          support. Email{" "}
          <a href="mailto:support@cosyaura.com">support@cosyaura.com</a> or visit
          our <Link href="/contact">Contact</Link> page.
        </p>
      </ContentSection>

      <ContentCta href="/contact" label="Contact Us" />
    </ContentPage>
  );
}
