import type { Metadata } from "next";
import { ScentJournalClient } from "@/components/perfume/ScentJournalClient";
import { absoluteUrl, defaultOgImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Scent Journal",
  description: "Track worn perfumes and keep private scent memories.",
  alternates: { canonical: absoluteUrl("/scent-journal") },
  openGraph: {
    title: "Scent Journal | COSY AURA",
    description: "Your personal wear log and scent memories.",
    url: absoluteUrl("/scent-journal"),
    images: [defaultOgImage()],
  },
};

export default function ScentJournalPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
      <h1 className="font-playfair text-3xl md:text-4xl mb-2">Scent Journal</h1>
      <p className="text-sm text-wf-gray mb-10 max-w-2xl">
        Log what you wear and keep private notes - stored on this device for
        your eyes only.
      </p>
      <ScentJournalClient />
    </div>
  );
}
