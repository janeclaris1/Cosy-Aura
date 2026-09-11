import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "@/components/content/ContactForm";
import { SocialLinks } from "@/components/layout/SocialLinks";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with COSY AURA for product questions, orders, and support.",
};

export default function ContactPage() {
  return (
    <div className="font-cantora">
      <section className="relative overflow-hidden border-b border-wf-border min-h-[320px] md:min-h-[420px]">
        <Image
          src="/images/hero/black-orchid.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20"
          aria-hidden
        />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
          <p className="text-xs uppercase tracking-[0.25em] text-[#0077b6] mb-4 animate-fade-up">
            COSY AURA
          </p>
          <h1 className="text-4xl md:text-6xl text-white mb-5 max-w-3xl animate-fade-up [animation-delay:80ms]">
            Contact
          </h1>
          <p className="text-white/85 text-base md:text-lg leading-relaxed max-w-xl animate-fade-up [animation-delay:160ms]">
            Questions about a fragrance, your order, or aftercare? Write to us.
            Our team replies with care.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-14 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <aside className="lg:col-span-4 space-y-10 animate-fade-up">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-wf-gray mb-3">
                Email
              </p>
              <a
                href="mailto:support@cosyaura.com"
                className="text-2xl text-wf-black hover:text-gold transition-colors break-all"
              >
                support@cosyaura.com
              </a>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-wf-gray mb-3">
                Hours
              </p>
              <p className="text-wf-black leading-relaxed">
                Monday to Friday
                <br />
                <span className="text-wf-gray">9:00 AM to 6:00 PM</span>
              </p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-wf-gray mb-3">
                Follow us
              </p>
              <SocialLinks variant="light" />
            </div>

            <div className="border-t border-wf-border pt-8">
              <p className="text-sm text-wf-gray leading-relaxed">
                For order updates, include your order number. We aim to reply
                within one business day.
              </p>
              <Link
                href="/faq"
                className="inline-block mt-4 text-sm text-wf-black border-b border-gold pb-0.5 hover:text-gold transition-colors"
              >
                Browse FAQ
              </Link>
            </div>
          </aside>

          <div className="lg:col-span-8 lg:pl-16 animate-fade-up [animation-delay:80ms]">
            <div className="bg-white shadow-sm ring-1 ring-black/[0.06] px-6 py-8 sm:px-8 sm:py-10">
              <h2 className="font-playfair text-3xl text-[#03045e] mb-2">
                Send a message
              </h2>
              <p className="text-sm text-mocha mb-8">
                Tell us what you need: product details, shipping, or returns.
              </p>
              <Suspense
                fallback={
                  <p className="text-sm text-wf-gray">Loading form…</p>
                }
              >
                <ContactForm />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
