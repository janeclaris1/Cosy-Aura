"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Shield } from "lucide-react";
import { useShopperCountry, useT } from "@/lib/locale-store";
import {
  resolveContactWhatsApp,
  type ContactWhatsApp,
} from "@/lib/contact-whatsapp";

export function TopUtilityBar() {
  const t = useT();
  const country = useShopperCountry();
  const [contact, setContact] = useState<ContactWhatsApp>(() =>
    resolveContactWhatsApp(country)
  );

  useEffect(() => {
    const fallback = resolveContactWhatsApp(country);
    setContact(fallback);

    const code = country || "US";
    let cancelled = false;
    void fetch(`/api/store/contact-whatsapp?country=${encodeURIComponent(code)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ContactWhatsApp | null) => {
        if (!cancelled && data?.phone) setContact(data);
      })
      .catch(() => {
        /* keep env fallback */
      });
    return () => {
      cancelled = true;
    };
  }, [country]);

  const trustItems = [
    { icon: Package, label: t("util.delivery") },
    { icon: Shield, label: t("util.return") },
  ] as const;

  return (
    <div className="bg-[#02033f] text-[12px] sm:text-[13px] text-white/90">
      <div className="max-w-7xl mx-auto px-4 h-9 sm:h-10 flex items-center justify-between gap-4">
        <ul className="flex items-center gap-4 sm:gap-8 min-w-0 overflow-x-auto scrollbar-thin">
          <li className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
            <a
              href={contact.waMeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-[#25D366] hover:opacity-80 transition-opacity"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 fill-current"
                aria-hidden
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span>{contact.display || contact.phone}</span>
            </a>
          </li>
          {trustItems.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-[#FFD200]" strokeWidth={1.75} />
              <span>{label}</span>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-3 shrink-0 text-white/80">
          <a
            href="mailto:support@cosyaura.com"
            className="font-semibold text-[#3b66a0] hover:text-[#3b66a0] underline underline-offset-2 transition-colors duration-organic ease-organic"
          >
            support@cosyaura.com
          </a>
          <span className="text-white/30" aria-hidden>
            |
          </span>
          <Link href="/faq" className="hover:text-[#FFD200] transition-colors duration-organic ease-organic">
            {t("util.help")}
          </Link>
          <span className="text-white/30" aria-hidden>
            |
          </span>
          <Link href="/contact" className="hover:text-[#FFD200] transition-colors duration-organic ease-organic">
            {t("util.contact")}
          </Link>
        </div>
      </div>
    </div>
  );
}
