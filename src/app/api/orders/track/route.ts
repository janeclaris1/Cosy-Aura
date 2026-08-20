import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  formatOrderRef,
  orderStatusLabel,
  resolveTrackingUrl,
} from "@/lib/order-tracking";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderRef = String(body.orderRef || body.orderId || "")
      .trim()
      .toUpperCase();
    const email = String(body.email || "").trim().toLowerCase();

    if (!orderRef || !email) {
      return NextResponse.json(
        { error: "Order number and email are required" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const prefix = orderRef.replace(/[^A-Z0-9]/gi, "").slice(0, 8);
    if (prefix.length < 6) {
      return NextResponse.json(
        { error: "Enter a valid order number" },
        { status: 400 }
      );
    }

    const candidates = await prisma.order.findMany({
      where: {
        email: { equals: email, mode: "insensitive" },
        id: { startsWith: prefix.toLowerCase() },
      },
      include: {
        items: {
          include: {
            fragrance: {
              include: {
                brand: true,
                images: { orderBy: { sortOrder: "asc" }, take: 1 },
              },
            },
          },
        },
      },
      take: 5,
    });

    // Also try exact id match if a full cuid was pasted
    let order =
      candidates.find((o) => o.id.toUpperCase().startsWith(prefix)) || null;

    if (!order && orderRef.length > 8) {
      order = await prisma.order.findFirst({
        where: {
          id: orderRef.toLowerCase(),
          email: { equals: email, mode: "insensitive" },
        },
        include: {
          items: {
            include: {
              fragrance: {
                include: {
                  brand: true,
                  images: { orderBy: { sortOrder: "asc" }, take: 1 },
                },
              },
            },
          },
        },
      });
    }

    if (!order) {
      return NextResponse.json(
        { error: "No order found for that number and email" },
        { status: 404 }
      );
    }

    const trackingUrl = resolveTrackingUrl(order);

    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        ref: formatOrderRef(order.id),
        status: order.status,
        statusLabel: orderStatusLabel(order.status),
        total: order.total,
        createdAt: order.createdAt,
        shippedAt: order.shippedAt,
        shippingMethod: order.shippingMethod,
        shippingCity: order.shippingCity,
        shippingCountry: order.shippingCountry,
        deliveryDate: order.deliveryDate,
        carrier: order.carrier,
        trackingNumber: order.trackingNumber,
        trackingUrl,
        items: order.items.map((item) => ({
          quantity: item.quantity,
          price: item.price,
          brand: item.fragrance.brand.name,
          model: item.fragrance.model,
          reference: item.fragrance.reference,
          image: item.fragrance.images[0]?.url || null,
        })),
      },
    });
  } catch (error) {
    console.error("[orders/track]", error);
    return NextResponse.json(
      { error: "Could not look up order" },
      { status: 500 }
    );
  }
}
