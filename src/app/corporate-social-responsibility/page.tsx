import type { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content/ContentPage";

export const metadata: Metadata = {
  title: "Corporate Social Responsibility",
  description:
    "Cosy Aura corporate social responsibility — details coming soon.",
  robots: { index: false, follow: true },
};

export default function CorporateSocialResponsibilityPage() {
  return (
    <ContentPage title="Corporate Social Responsibility">
      <ContentSection>
        <p className="text-xl md:text-2xl text-wf-gray font-playfair">
          Coming soon.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
