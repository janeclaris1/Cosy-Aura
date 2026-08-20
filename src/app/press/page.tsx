import type { Metadata } from "next";
import {
  ContentCta,
  ContentPage,
  ContentSection,
} from "@/components/content/ContentPage";

export const metadata: Metadata = {
  title: "Press",
  description:
    "Press and media resources for COSY AURA.",
};

const STORIES = [
  {
    outlet: "Luxury Retail Weekly",
    date: "2026",
    title: "New digital destinations reshaping access to luxury fragrances",
  },
  {
    outlet: "Fragrance Digest",
    date: "2025",
    title: "How curated ecommerce is changing first-time luxury buyers",
  },
  {
    outlet: "Style & Scent",
    date: "2025",
    title: "Brand-new collections meet modern checkout expectations",
  },
];

export default function PressPage() {
  return (
    <ContentPage
      title="Press"
      subtitle="Media enquiries, brand assets, and recent coverage related to COSY AURA."
    >
      <ContentSection title="Media contact">
        <p>
          For interviews, product features, or brand assets, email{" "}
          <a
            href="mailto:press@cosyaura.com"
            className="text-gold hover:text-gold-light"
          >
            press@cosyaura.com
          </a>
          . Please include your outlet, deadline, and topic.
        </p>
      </ContentSection>

      <ContentSection title="About the brand">
        <p>
          COSY AURA is an online luxury fragrance retailer specializing
          in brand-new fragrances from Chanel, Dior, Tom Ford, Creed,
          Cartier, and Louis Vuitton. Orders are fulfilled after successful
          payment confirmation, with a 14-day returns window.
        </p>
      </ContentSection>

      <ContentSection title="Selected coverage">
        <ul className="divide-y divide-wf-border border-y border-wf-border">
          {STORIES.map((story) => (
            <li key={story.title} className="py-5">
              <p className="text-xs uppercase tracking-wider text-gold mb-1">
                {story.outlet} · {story.date}
              </p>
              <p className="font-medium text-wf-black">{story.title}</p>
            </li>
          ))}
        </ul>
      </ContentSection>

      <ContentCta href="/about" label="Learn About Us" />
    </ContentPage>
  );
}
