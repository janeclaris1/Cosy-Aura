import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { StaffRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import {
  isSuperAdminEmail,
  STAFF_ROLES,
  staffRoleLabel,
  staffRoleNeedsCountry,
} from "@/lib/rbac";
import { sendEmail } from "@/lib/notifications";
import { writeAuditLog } from "@/lib/audit";

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

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  return null;
}

async function sendStaffWelcomeEmail(input: {
  email: string;
  name: string | null;
  roleLabel: string;
}) {
  const loginUrl = `${siteBaseUrl()}/admin/login`;
  await sendEmail({
    to: input.email,
    subject: "Your Cosy Aura admin account",
    html: `<!DOCTYPE html><body style="font-family:Georgia,serif;color:#1A1A1A;max-width:560px;margin:0 auto;padding:24px;">
      <p style="letter-spacing:2px;font-size:14px;color:#03045e;">COSY AURA</p>
      <h1 style="font-size:22px;">Welcome to the admin portal</h1>
      <p>Hi ${input.name || "there"},</p>
      <p>You have been added as <strong>${input.roleLabel}</strong>.</p>
      <p>Your administrator will provide your login password separately. We never email passwords.</p>
      <p><a href="${loginUrl}" style="display:inline-block;background:#03045e;color:#fff;padding:12px 20px;text-decoration:none;">Sign in</a></p>
      <p style="font-size:13px;color:#666;">Or open: ${loginUrl}</p>
    </body></html>`,
  });
}

export async function GET() {
  const { ctx, error } = await requireAdminApi("staff.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
  const staff = await prisma.user.findMany({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      image: true,
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
  } catch (err) {
    console.error("[staff GET]", err);
    return NextResponse.json(
      { error: "Could not load staff. Check your database connection and try again." },
      { status: 503 }
    );
  }
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

  /** Super Admin sets a staff member's password directly. */
  if (body.setPassword === true) {
    const password = String(body.password || "");
    const confirmPassword = String(body.confirmPassword || "");
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    }
    if (isSuperAdminEmail(user.email)) {
      return NextResponse.json(
        { error: "Super Admin passwords are managed outside staff settings." },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash, activeStaff: true },
    });

    await writeAuditLog({
      actorId: ctx.userId,
      action: "staff.set_password",
      entityType: "User",
      entityId: user.id,
      summary: `Super Admin set password for ${email}`,
      req,
    });

    return NextResponse.json({ ok: true, passwordSet: true });
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
  if (staffRoleNeedsCountry(staffRoleRaw) && !staffCountry) {
    return NextResponse.json(
      { error: "This role needs a staff country (GH or CM)." },
      { status: 400 }
    );
  }
  if (!staffRoleNeedsCountry(staffRoleRaw)) staffCountry = null;

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
  const password = String(body.password || "");
  const confirmPassword = String(body.confirmPassword || "");

  let user = await prisma.user.findUnique({ where: { email } });
  let created = false;

  if (!user) {
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 12);
    user = await prisma.user.create({
      data: {
        email,
        name,
        phone,
        password: hash,
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
      image: true,
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
    await sendStaffWelcomeEmail({
      email,
      name,
      roleLabel: staffRoleLabel(staffRoleRaw),
    });
    await writeAuditLog({
      actorId: ctx.userId,
      action: "staff.invite",
      entityType: "User",
      entityId: user.id,
      summary: `Invited staff ${email} as ${staffRoleRaw} (password set by Super Admin)`,
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
    { staff: full, invited: created },
    { status: created ? 201 : 200 }
  );
}
