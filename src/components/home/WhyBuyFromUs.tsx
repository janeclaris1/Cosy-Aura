"use client";

import { CheckCircle, Truck, Star } from "lucide-react";
import { useT } from "@/lib/locale-store";

const FEATURES = [
  {
    icon: CheckCircle,
    titleKey: "home.whyOilTitle",
    bodyKey: "home.whyOilBody",
  },
  {
    icon: Truck,
    titleKey: "home.whySillageTitle",
    bodyKey: "home.whySillageBody",
  },
  {
    icon: Star,
    titleKey: "home.whyReturnTitle",
    bodyKey: "home.whyReturnBody",
  },
] as const;

export function WhyBuyFromUs() {
  const t = useT();

  return (
    <section className="py-16 px-4 bg-wf-light">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-playfair text-3xl text-center mb-12">{t("home.whyTitle")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {FEATURES.map((feature) => (
            <div key={feature.titleKey} className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-gold" />
              </div>
              <h3 className="font-semibold text-wf-black mb-2">{t(feature.titleKey)}</h3>
              <p className="text-sm text-wf-gray leading-relaxed">{t(feature.bodyKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
