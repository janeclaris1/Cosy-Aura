import type { Metadata } from "next";
import { AboutPageContent } from "@/components/about/AboutPageContent";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Cosy Aura curates alcohol-free perfume oils with shops in Accra, Mamfe, and Yaoundé — secure checkout, WhatsApp support, and a 14-day return.",
};

export default function AboutPage() {
  return <AboutPageContent />;
}
