import type { Metadata } from "next";
import { AboutPageContent } from "@/components/about/AboutPageContent";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "COSY AURA curates handcrafted oil-based luxury perfume oils inspired by Grasse - sustainable, vegan-friendly, alcohol-free, with secure checkout and trial & return.",
};

export default function AboutPage() {
  return <AboutPageContent />;
}
