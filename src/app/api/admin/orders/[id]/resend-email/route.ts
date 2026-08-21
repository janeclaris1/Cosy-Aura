import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { notifyOrderPaid } from "@/lib/notifications";
import { stripe } from "@/lib/stripe";

const PLACEHOLDER_EMAIL = "pending@checkout.cosyaura.com";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdminApi("orders.write");
  if (error) return error;

  let order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status === "PENDING") {
    return NextResponse.json(
      { error: "Order is still PENDING - wait for payment first" },
      { status: 400 }
    );
  }

  // Recover real customer email from Stripe when admin marked PAID early
  if (
    stripe &&
    order.stripeSessionId &&
    (!order.email || order.email === PLACEHOLDER_EMAIL)
  ) {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        order.stripeSessionId
      );
      const email =
        session.customer_details?.email || session.customer_email || null;
      if (email) {
        order = await prisma.order.update({
          where: { id: order.id },
          data: {
            email,
            shippingName:
              session.shipping_details?.name ||
              session.customer_details?.name ||
              order.shippingName,
            shippingAddress:
              session.shipping_details?.address?.line1 || order.shippingAddress,
            shippingCity:
              session.shipping_details?.address?.city || order.shippingCity,
            shippingPostcode:
              session.shipping_details?.address?.postal_code ||
              order.shippingPostcode,
            shippingCountry:
              session.shipping_details?.address?.country ||
              order.shippingCountry,
            shippingPhone:
              session.customer_details?.phone || order.shippingPhone,
          },
        });
      }
    } catch (err) {
      console.error("[resend-email] stripe session lookup failed:", err);
    }
  }

  if (!order.email || order.email === PLACEHOLDER_EMAIL) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Order has no customer email. Open the Stripe session and set the email on the order first.",
      },
      { status: 400 }
    );
  }

  const result = await notifyOrderPaid(order.id);
  if (!result.customerOk) {
    return NextResponse.json(
      { ok: false, error: result.error || "Email failed" },
      { status: 502 }
    );
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { confirmationEmailedAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    email: order.email,
    adminEmailSent: result.adminOk,
    customerWhatsAppSent: result.customerWhatsAppOk,
    warning: result.adminOk ? undefined : result.error || "Admin email failed",
  });
}
