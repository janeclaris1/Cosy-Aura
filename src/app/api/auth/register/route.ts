import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { upsertMailchimpContact } from "@/lib/mailchimp";

function normalizePhone(raw: string): string {
  return raw.trim().replace(/[\s()-]/g, "");
}

function isValidPhone(phone: string): boolean {
  // Allow +, digits; require at least 8 digits total
  if (!/^\+?[0-9]{8,15}$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = normalizePhone(String(body.phone || ""));
    const password = String(body.password || "");
    const subscribeNewsletter = body.subscribeNewsletter !== false;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: "Phone / WhatsApp number is required" },
        { status: 400 }
      );
    }

    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { error: "Enter a valid phone / WhatsApp number (include country code)" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Sign in to keep your 5% member discount." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        phone,
        password: hashedPassword,
        role: "USER",
        memberDiscount: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        memberDiscount: true,
      },
    });

    if (subscribeNewsletter) {
      await prisma.newsletterSubscriber.upsert({
        where: { email },
        update: { phone },
        create: { email, phone },
      });
      void upsertMailchimpContact({
        email,
        phone,
        name: name || null,
        tags: ["newsletter", "account-signup"],
      });
    }

    return NextResponse.json({
      ok: true,
      user,
      memberDiscountPercent: 5,
    });
  } catch (error) {
    console.error("[register]", error);
    return NextResponse.json(
      { error: "Could not create account" },
      { status: 500 }
    );
  }
}
