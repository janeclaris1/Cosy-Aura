import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  consumeAdminPasswordToken,
  writeAuditLog,
} from "@/lib/audit";
import { isAdminRateLimited } from "@/lib/admin-rate-limit";

/** Public: set admin password via one-time invite/reset token. */
export async function POST(req: Request) {
  if (isAdminRateLimited(req, "set-password", 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const token = String(body.token || "").trim();
  const password = String(body.password || "");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const result = await consumeAdminPasswordToken(token);
  if (!result.ok || !result.userId) {
    return NextResponse.json(
      { error: result.error || "Invalid link" },
      { status: 400 }
    );
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.update({
    where: { id: result.userId },
    data: { password: hash, activeStaff: true },
    select: { id: true, email: true },
  });

  await writeAuditLog({
    actorId: user.id,
    action: "auth.password_set",
    entityType: "User",
    entityId: user.id,
    summary: `Admin password set via ${result.purpose} link (${user.email})`,
    req,
    metadata: { purpose: result.purpose },
  });

  return NextResponse.json({ ok: true });
}
