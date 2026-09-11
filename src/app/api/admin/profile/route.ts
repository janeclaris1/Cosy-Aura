import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { uploadStaffAvatar } from "@/lib/avatar-upload";
import { isSuperAdminEmail, staffRoleLabel } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

function profileSelect() {
  return {
    id: true,
    email: true,
    name: true,
    phone: true,
    image: true,
    staffRole: true,
    staffCountry: true,
    activeStaff: true,
  } as const;
}

export async function GET() {
  const { ctx, error } = await requireAdminApi();
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: profileSelect(),
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    profile: {
      ...user,
      isSuperAdmin: isSuperAdminEmail(user.email),
      roleLabel: user.staffRole
        ? staffRoleLabel(user.staffRole)
        : isSuperAdminEmail(user.email)
          ? "Super Admin"
          : "Admin",
    },
  });
}

export async function PATCH(req: Request) {
  const { ctx, error } = await requireAdminApi(undefined, {
    req,
    rateLimitKey: "profile",
  });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name = body.name != null ? String(body.name).trim() : undefined;
  const phone = body.phone != null ? String(body.phone).trim() : undefined;

  const user = await prisma.user.update({
    where: { id: ctx.userId },
    data: {
      ...(name !== undefined ? { name: name || null } : {}),
      ...(phone !== undefined ? { phone: phone || null } : {}),
    },
    select: profileSelect(),
  });

  return NextResponse.json({ profile: user });
}

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi(undefined, {
    req,
    rateLimitKey: "profile",
  });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const remove = formData.get("remove") === "true";

  if (remove) {
    const user = await prisma.user.update({
      where: { id: ctx.userId },
      data: { image: null },
      select: profileSelect(),
    });
    return NextResponse.json({ profile: user });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  }

  const mime = file.type || "image/jpeg";
  const buffer = Buffer.from(await file.arrayBuffer());

  let imageUrl: string;
  try {
    imageUrl = await uploadStaffAvatar(ctx.userId, buffer, mime);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: ctx.userId },
    data: { image: imageUrl },
    select: profileSelect(),
  });

  return NextResponse.json({ profile: user });
}
