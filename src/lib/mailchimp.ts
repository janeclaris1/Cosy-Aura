import "server-only";

import { createHash } from "node:crypto";

export type MailchimpContact = {
  email: string;
  phone?: string | null;
  name?: string | null;
  tags?: string[];
};

export function mailchimpConfigured(): boolean {
  return Boolean(
    process.env.MAILCHIMP_API_KEY?.trim() &&
      process.env.MAILCHIMP_AUDIENCE_ID?.trim()
  );
}

function datacenterFromApiKey(apiKey: string): string | null {
  const fromEnv = process.env.MAILCHIMP_SERVER_PREFIX?.trim();
  if (fromEnv) return fromEnv.replace(/^https?:\/\//, "").split(".")[0];
  const parts = apiKey.split("-");
  const dc = parts[parts.length - 1];
  return dc && /^[a-z]+\d+$/i.test(dc) ? dc : null;
}

function subscriberHash(email: string): string {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

function splitName(name?: string | null): { FNAME?: string; LNAME?: string } {
  const trimmed = String(name || "").trim();
  if (!trimmed) return {};
  const [first, ...rest] = trimmed.split(/\s+/);
  return {
    FNAME: first,
    ...(rest.length ? { LNAME: rest.join(" ") } : {}),
  };
}

/**
 * Upsert a contact into the configured Mailchimp audience.
 * Never throws to callers — returns ok/false so signup flows stay resilient.
 */
export async function upsertMailchimpContact(
  contact: MailchimpContact
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.MAILCHIMP_API_KEY?.trim();
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID?.trim();
  if (!apiKey || !audienceId) {
    return { ok: false, skipped: true, error: "Mailchimp is not configured" };
  }

  const email = contact.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Invalid email" };
  }

  const dc = datacenterFromApiKey(apiKey);
  if (!dc) {
    return {
      ok: false,
      error:
        "Could not determine Mailchimp server prefix. Set MAILCHIMP_SERVER_PREFIX (e.g. us21).",
    };
  }

  const mergeFields: Record<string, string> = {
    ...splitName(contact.name),
  };
  const phone = String(contact.phone || "").trim();
  if (phone) mergeFields.PHONE = phone;

  const body: Record<string, unknown> = {
    email_address: email,
    status_if_new: "subscribed",
    status: "subscribed",
    merge_fields: mergeFields,
  };
  if (contact.tags?.length) {
    body.tags = contact.tags;
  }

  const url = `https://${dc}.api.mailchimp.com/3.0/lists/${audienceId}/members/${subscriberHash(email)}`;

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `apikey ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[mailchimp] upsert failed", res.status, text.slice(0, 400));
      return {
        ok: false,
        error: `Mailchimp error ${res.status}`,
      };
    }
    return { ok: true };
  } catch (error) {
    console.error("[mailchimp] upsert network error", error);
    return { ok: false, error: "Mailchimp network error" };
  }
}

export async function syncContactsToMailchimp(
  contacts: MailchimpContact[]
): Promise<{ synced: number; failed: number; skipped: boolean }> {
  if (!mailchimpConfigured()) {
    return { synced: 0, failed: 0, skipped: true };
  }

  let synced = 0;
  let failed = 0;
  for (const contact of contacts) {
    const result = await upsertMailchimpContact(contact);
    if (result.ok) synced += 1;
    else if (!result.skipped) failed += 1;
  }
  return { synced, failed, skipped: false };
}
