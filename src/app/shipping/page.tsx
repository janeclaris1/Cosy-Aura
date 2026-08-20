import type { Metadata } from "next";
import {
  ContentCta,
  ContentPage,
  ContentSection,
} from "@/components/content/ContentPage";
import { cookies } from "next/headers";
import { getActiveShippingMethods } from "@/lib/shipping-methods";
import { formatPrice } from "@/lib/utils";
import { LOCALE_COOKIE, parseLocaleCookie } from "@/lib/locale-cookie";

export const metadata: Metadata = {
  title: "Shipping",
  description:
    "Learn how COSY AURA prepares and delivers your luxury fragrance after payment confirmation.",
};

export const dynamic = "force-dynamic";

export default async function ShippingPage() {
  const methods = await getActiveShippingMethods();
  const loc = parseLocaleCookie((await cookies()).get(LOCALE_COOKIE)?.value);
  const currency = loc?.currency || "GHS";

  return (
    <ContentPage
      title="Shipping"
      subtitle="Secure packaging and tracked delivery - your fragrance leaves our care only after payment is confirmed."
    >
      <ContentSection title="How shipping works">
        <p>
          Once your payment is confirmed, our team prepares your fragrance for
          dispatch. Each bottle is packed in protective materials designed
          for luxury fragrances and sent with full tracking.
        </p>
        <p>
          Most orders ship within <strong className="text-wf-black">1-3 business days</strong>.
          We deliver <strong className="text-wf-black">Monday to Saturday</strong> -
          choose your preferred delivery date at checkout. Delivery estimates also
          depend on your destination and the service selected.
        </p>
      </ContentSection>

      <ContentSection title="Delivery options">
        <ul className="list-disc pl-5 space-y-2">
          {methods.map((method) => (
            <li key={method.id}>
              <strong className="text-wf-black">{method.name}</strong> -{" "}
              {formatPrice(method.price, currency)} · {method.eta}
              {method.description ? `. ${method.description}` : ""}
            </li>
          ))}
        </ul>
        <p className="mt-4">
          Shipping is selected at checkout. Duties and taxes on international
          orders (if applicable) are the buyer’s responsibility unless stated
          otherwise.
        </p>
      </ContentSection>

      <ContentSection title="Packaging & security">
        <p>
          Fragrances are shipped in discreet outer packaging with no brand
          markings on the exterior. Signature may be required on delivery for
          high-value orders.
        </p>
      </ContentSection>

      <ContentSection title="Worldwide delivery">
        <p>
          We ship worldwide. Choose your delivery option at checkout - rates and
          timing are shown before you pay. Duties, taxes, and customs clearance
          (if applicable) are the responsibility of the buyer unless stated
          otherwise at checkout.
        </p>
      </ContentSection>

      <ContentCta label="Shop Fragrances" />
    </ContentPage>
  );
}
