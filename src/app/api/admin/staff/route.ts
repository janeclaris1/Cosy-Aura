import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import type { StaffRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { isSuperAdminEmail, STAFF_ROLES, staffRoleLabel } from "@/lib/rbac";
import { sendEmail } from "@/lib/notifications";
import {
  createAdminPasswordToken,
  writeAuditLog,
} from "@/lib/audit";

function isStaffRole(value: string): value is StaffRole {
  return (STAFF_ROLES as string[]).includes(value);
}

function siteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

async function sendPasswordLinkEmail(input: {
  email: string;
  name: string | null;
  roleLabel: string;
  rawToken: string;
  purpose: "invite" | "reset";
}) {
  const setUrl = `${siteBaseUrl()}/admin/set-password?token=${encodeURIComponent(input.rawToken)}`;
  const isInvite = input.purpose === "invite";
  await sendEmail({
    to: input.email,
    subject: isInvite
      ? "Your Cosy Aura admin invite"
      : "Reset your Cosy Aura admin password",
    html: `<!DOCTYPE html><body style="font-family:Georgia,serif;color:#1A1A1A;max-width:560px;margin:0 auto;padding:24px;">
      <p style="letter-spacing:2px;font-size:14px;color:#03045e;">COSY AURA</p>
      <h1 style="font-size:22px;">${isInvite ? "Welcome to the admin portal" : "Password reset"}</h1>
      <p>Hi ${input.name || "there"},</p>
      ${
        isInvite
          ? `<p>You have been invited as <strong>${input.roleLabel}</strong>.</p>`
          : `<p>A Super Admin requested a password reset for your admin account.</p>`
      }
      <p><a href="${setUrl}" style="display:inline-block;background:#03045e;color:#fff;padding:12px 20px;text-decoration:none;">Set your password</a></p>
      <p style="font-size:13px;color:#666;">Or open: ${setUrl}</p>
      <p style="font-size:13px;color:#666;">This link expires in 48 hours and can only be used once. We never email your password.</p>
    </body></html>`,
  });
}

export async function GET() {
  const { ctx, error } = await requireAdminApi("staff.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const staff = await prisma.user.findMany({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      staffRole: true,
      staffCountry: true,
      activeStaff: true,
      createdAt: true,
      staffAssignments: {
        select: {
          branchId: true,
          branch: { select: { id: true, name: true, country: true } },
        },
      },
    },
  });

  return NextResponse.json({
    staff: staff.map((u) => ({
      ...u,
      isSuperAdmin: isSuperAdminEmail(u.email),
    })),
  });
}

/** Invite or update an admin staff member. Super Admin only. */
export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("staff.write", {
    req,
    rateLimitKey: "staff",
  });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isSuperAdmin) {
    return NextResponse.json(
      { error: "Only a Super Admin can manage staff." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  // Password-reset link only (no plaintext passwords).
  if (body.sendResetLink === true) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    }
    if (isSuperAdminEmail(user.email)) {
      return NextResponse.json(
        { error: "Reset Super Admin password via your account settings / env owner." },
        { status: 400 }
      );
    }
    const rawToken = await createAdminPasswordToken({
      userId: user.id,
      purpose: "reset",
    });
    await sendPasswordLinkEmail({
      email: user.email,
      name: user.name,
      roleLabel: staffRoleLabel(user.staffRole || "FULFILMENT"),
      rawToken,
      purpose: "reset",
    });
    await writeAuditLog({
      actorId: ctx.userId,
      action: "staff.reset_link",
      entityType: "User",
      entityId: user.id,
      summary: `Sent password reset link to ${email}`,
      req,
    });
    return NextResponse.json({ ok: true, resetLinkSent: true });
  }

  const staffRoleRaw = String(body.staffRole || "").trim().toUpperCase();
  if (!isStaffRole(staffRoleRaw)) {
    return NextResponse.json(
      { error: "Select a valid staff role (not Super Admin)." },
      { status: 400 }
    );
  }

  let staffCountry =
    body.staffCountry != null
      ? String(body.staffCountry).trim().toUpperCase() || null
      : null;
  if (staffRoleRaw === "COUNTRY_MANAGER" && !staffCountry) {
    return NextResponse.json(
      { error: "Country managers need a staff country (GH or CM)." },
      { status: 400 }
    );
  }
  if (staffRoleRaw !== "COUNTRY_MANAGER") staffCountry = null;

  const branchIds: string[] = Array.isArray(body.branchIds)
    ? body.branchIds.map((id: unknown) => String(id)).filter(Boolean)
    : [];

  if (
    (staffRoleRaw === "BRANCH_MANAGER" || staffRoleRaw === "FULFILMENT") &&
    branchIds.length === 0
  ) {
    return NextResponse.json(
      { error: "Assign at least one branch for this role." },
      { status: 400 }
    );
  }

  const name = body.name != null ? String(body.name).trim() : null;
  const phone = body.phone != null ? String(body.phone).trim() : null;

  let user = await prisma.user.findUnique({ where: { email } });
  let created = false;

  if (!user) {
    // Placeholder hash — staff must set password via invite link (never emailed).
    const placeholder = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
    user = await prisma.user.create({
      data: {
        email,
        name,
        phone,
        password: placeholder,
        role: "ADMIN",
        staffRole: staffRoleRaw,
        staffCountry,
        activeStaff: body.activeStaff !== false,
        memberDiscount: false,
      },
    });
    created = true;
  } else {
    if (isSuperAdminEmail(user.email)) {
      return NextResponse.json(
        { error: "This account is a Super Admin (env) and cannot be edited here." },
        { status: 400 }
      );
    }
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: "ADMIN",
        staffRole: staffRoleRaw,
        staffCountry,
        activeStaff: body.activeStaff !== false,
        ...(name !== null ? { name } : {}),
        ...(phone !== null ? { phone } : {}),
      },
    });
  }

  await prisma.staffAssignment.deleteMany({ where: { userId: user.id } });
  if (branchIds.length) {
    const valid = await prisma.branch.findMany({
      where: { id: { in: branchIds } },
      select: { id: true },
    });
    await prisma.staffAssignment.createMany({
      data: valid.map((b) => ({ userId: user!.id, branchId: b.id })),
    });
  }

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      staffRole: true,
      staffCountry: true,
      activeStaff: true,
      staffAssignments: {
        select: {
          branchId: true,
          branch: { select: { id: true, name: true, country: true } },
        },
      },
    },
  });

  if (created) {
    const rawToken = await createAdminPasswordToken({
      userId: user.id,
      purpose: "invite",
    });
    await sendPasswordLinkEmail({
      email,
      name,
      roleLabel: staffRoleLabel(staffRoleRaw),
      rawToken,
      purpose: "invite",
    });
    await writeAuditLog({
      actorId: ctx.userId,
      action: "staff.invite",
      entityType: "User",
      entityId: user.id,
      summary: `Invited staff ${email} as ${staffRoleRaw}`,
      req,
    });
  } else {
    await writeAuditLog({
      actorId: ctx.userId,
      action: "staff.update",
      entityType: "User",
      entityId: user.id,
      summary: `Updated staff ${email} (${staffRoleRaw})`,
      req,
    });
  }

  return NextResponse.json(
    { staff: full, invited: created, inviteLinkSent: created },
    { status: created ? 201 : 200 }
  );
}
