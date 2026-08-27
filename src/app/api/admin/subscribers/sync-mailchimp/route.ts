import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  mailchimpConfigured,
  syncContactsToMailchimp,
} from "@/lib/mailchimp";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("settings.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!mailchimpConfigured()) {
    return NextResponse.json(
      {
        error:
          "Mailchimp is not configured. Set MAILCHIMP_API_KEY and MAILCHIMP_AUDIENCE_ID.",
      },
      { status: 400 }
    );
  }

  const subscribers = await prisma.newsletterSubscriber.findMany({
    orderBy: { createdAt: "asc" },
  });

  const result = await syncContactsToMailchimp(
    subscribers.map((s) => ({
      email: s.email,
      phone: s.phone,
      tags: ["newsletter", "admin-sync"],
    }))
  );

  await writeAuditLog({
    actorId: ctx.userId,
    action: "newsletter.mailchimp_sync",
    entityType: "NewsletterSubscriber",
    summary: `Synced ${result.synced}/${subscribers.length} subscribers to Mailchimp`,
    req,
    metadata: result,
  });

  return NextResponse.json({
    total: subscribers.length,
    ...result,
  });
}
