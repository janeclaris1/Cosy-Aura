import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upsertMailchimpContact } from "@/lib/mailchimp";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : null;
    const name = body.name ? String(body.name).trim() : null;

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {
        ...(phone ? { phone } : {}),
      },
      create: { email, phone },
    });

    void upsertMailchimpContact({
      email,
      phone,
      name,
      tags: ["newsletter"],
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
