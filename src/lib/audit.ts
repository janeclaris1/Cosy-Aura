import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type AuditInput = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
  req?: Request | null;
};

export function clientIpFromRequest(req: Request | null | undefined): string | null {
  if (!req) return null;
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

export function userAgentFromRequest(req: Request | null | undefined): string | null {
  if (!req) return null;
  const ua = req.headers.get("user-agent");
  return ua ? ua.slice(0, 300) : null;
}

/** Best-effort activity log — never throws into the request path. */
export async function writeAuditLog(input: AuditInput): Promise<void> {
  try {
    const ip =
      input.ipAddress ?? clientIpFromRequest(input.req) ?? null;
    const ua =
      input.userAgent ?? userAgentFromRequest(input.req) ?? null;
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId || null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || null,
        summary: input.summary.slice(0, 500),
        metadata: input.metadata ?? undefined,
        ipAddress: ip,
        userAgent: ua,
      },
    });
  } catch (err) {
    console.error("[audit]", err);
  }
}

export function hashPasswordToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Create a one-time invite/reset token. Returns the raw token (show once). */
export async function createAdminPasswordToken(input: {
  userId: string;
  purpose: "invite" | "reset";
  ttlHours?: number;
}): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  const tokenHash = hashPasswordToken(raw);
  const hours = input.ttlHours ?? 48;
  await prisma.adminPasswordToken.create({
    data: {
      userId: input.userId,
      tokenHash,
      purpose: input.purpose,
      expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
    },
  });
  return raw;
}

export async function consumeAdminPasswordToken(raw: string): Promise<{
  ok: boolean;
  userId?: string;
  purpose?: string;
  error?: string;
}> {
  const tokenHash = hashPasswordToken(raw);
  const row = await prisma.adminPasswordToken.findUnique({
    where: { tokenHash },
  });
  if (!row) return { ok: false, error: "Invalid or expired link" };
  if (row.usedAt) return { ok: false, error: "This link was already used" };
  if (row.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "This link has expired" };
  }
  await prisma.adminPasswordToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return { ok: true, userId: row.userId, purpose: row.purpose };
}
