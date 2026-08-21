import type { Metadata } from "next";
import { TrackOrderForm } from "@/components/orders/TrackOrderForm";
import { ContentPage, ContentSection } from "@/components/content/ContentPage";

export const metadata: Metadata = {
  title: "Track Your Order",
  description:
    "Track your Cosy Aura order status and shipment using your order number and email.",
};

export default function TrackOrderPage({
  searchParams,
}: {
  searchParams?: { ref?: string; email?: string };
}) {
  return (
    <ContentPage
      title="Track Your Order"
      subtitle="Enter the order number from your confirmation email and the email address used at checkout. We will show your order status and shipment tracking when available."
    >
      <ContentSection title="Order lookup">
        <p>
          Your order number is usually an 8-character reference included in your
          confirmation email. Use the same email you entered at checkout. When
          your package ships, carrier tracking details also appear here and in
          your shipping notification.
        </p>
      </ContentSection>

      <div className="mb-10">
        <TrackOrderForm
          initialRef={searchParams?.ref || ""}
          initialEmail={searchParams?.email || ""}
        />
      </div>

      <ContentSection title="Need help?">
        <p>
          If you cannot find your order number, check your spam folder or email{" "}
          <a href="mailto:support@cosyaura.com">support@cosyaura.com</a> with the
          name and phone used at checkout. For delivery timing and options, see
          our <a href="/shipping">Shipping</a> page.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
