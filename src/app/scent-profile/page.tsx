import type { Metadata } from "next";
import { ScentProfileForm } from "@/components/perfume/ScentProfileForm";
import { absoluteUrl, defaultOgImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Scent Profile",
  description: "Build your fragrance preference profile for smarter recommendations.",
  alternates: { canonical: absoluteUrl("/scent-profile") },
  openGraph: {
    title: "Scent Profile | COSY AURA",
    description: "Preference atlas for families, occasions, and seasons.",
    url: absoluteUrl("/scent-profile"),
    images: [defaultOgImage()],
  },
};

export default function ScentProfilePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
      <ScentProfileForm />
    </div>
  );
}
