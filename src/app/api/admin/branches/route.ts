import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { ensureUniqueBranchSlug } from "@/lib/branches";
import { MANAGED_STOCK_COUNTRIES } from "@/lib/country-stock";

export async function GET() {
  const { ctx, error } = await requireAdminApi("branches.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where =
    ctx.isSuperAdmin || ctx.isGlobal
      ? {}
      : ctx.staffRole === "COUNTRY_MANAGER" && ctx.staffCountry
        ? { country: ctx.staffCountry }
        : ctx.branchIds.length
          ? { id: { in: ctx.branchIds } }
          : { id: "__none__" };

  const branches = await prisma.branch.findMany({
    where,
    orderBy: [{ country: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { staffAssignments: true, orders: true } },
    },
  });

  return NextResponse.json({ branches });
}

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("branches.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isSuperAdmin) {
    return NextResponse.json(
      { error: "Only a Super Admin can create branches." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  const country = String(body.country || "")
    .trim()
    .toUpperCase();
  const allowed = new Set(MANAGED_STOCK_COUNTRIES.map((c) => c.code));
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!allowed.has(country as "GH" | "CM")) {
    return NextResponse.json(
      { error: "Country must be GH or CM." },
      { status: 400 }
    );
  }

  const slug = await ensureUniqueBranchSlug(String(body.slug || name));
  const isDefault = Boolean(body.isDefault);

  if (isDefault) {
    await prisma.branch.updateMany({
      where: { country, isDefault: true },
      data: { isDefault: false },
    });
  }

  const branch = await prisma.branch.create({
    data: {
      name,
      slug,
      country,
      city: body.city ? String(body.city).trim() : null,
      address: body.address ? String(body.address).trim() : null,
      phone: body.phone ? String(body.phone).trim() : null,
      active: body.active !== false,
      isDefault,
      whatsappPhone: body.whatsappPhone
        ? String(body.whatsappPhone).replace(/\D/g, "") || null
        : null,
      codEnabled: body.codEnabled !== false,
      pickupEnabled: Boolean(body.pickupEnabled),
      dawuroboEnabled: body.dawuroboEnabled !== false,
      shaqexpressEnabled: body.shaqexpressEnabled !== false,
      openingHours: body.openingHours ? String(body.openingHours).trim() : null,
      deliveryNotes: body.deliveryNotes ? String(body.deliveryNotes).trim() : null,
    },
  });

  await writeAuditLog({
    actorId: ctx.userId,
    action: "branch.create",
    entityType: "Branch",
    entityId: branch.id,
    summary: `Created branch ${branch.name} (${branch.country})`,
    req,
  });

  return NextResponse.json({ branch }, { status: 201 });
}
