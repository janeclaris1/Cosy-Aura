import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { ensureUniqueBranchSlug } from "@/lib/branches";
import { MANAGED_STOCK_COUNTRIES } from "@/lib/country-stock";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { ctx, error } = await requireAdminApi("branches.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isSuperAdmin) {
    return NextResponse.json(
      { error: "Only a Super Admin can edit branches." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const existing = await prisma.branch.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Branch not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name != null) data.name = String(body.name).trim();
  if (body.city !== undefined) data.city = body.city ? String(body.city).trim() : null;
  if (body.address !== undefined) {
    data.address = body.address ? String(body.address).trim() : null;
  }
  if (body.phone !== undefined) data.phone = body.phone ? String(body.phone).trim() : null;
  if (body.active !== undefined) data.active = Boolean(body.active);

  if (body.whatsappPhone !== undefined) {
    const digits = String(body.whatsappPhone || "").replace(/\D/g, "");
    data.whatsappPhone = digits.length >= 8 ? digits : null;
  }
  if (body.codEnabled !== undefined) data.codEnabled = Boolean(body.codEnabled);
  if (body.pickupEnabled !== undefined) data.pickupEnabled = Boolean(body.pickupEnabled);
  if (body.dawuroboEnabled !== undefined) {
    data.dawuroboEnabled = Boolean(body.dawuroboEnabled);
  }
  if (body.shaqexpressEnabled !== undefined) {
    data.shaqexpressEnabled = Boolean(body.shaqexpressEnabled);
  }
  if (body.openingHours !== undefined) {
    data.openingHours = body.openingHours ? String(body.openingHours).trim() : null;
  }
  if (body.deliveryNotes !== undefined) {
    data.deliveryNotes = body.deliveryNotes ? String(body.deliveryNotes).trim() : null;
  }

  if (body.country != null) {
    const country = String(body.country).trim().toUpperCase();
    const allowed = new Set(MANAGED_STOCK_COUNTRIES.map((c) => c.code));
    if (!allowed.has(country as "GH" | "CM")) {
      return NextResponse.json({ error: "Country must be GH or CM." }, { status: 400 });
    }
    data.country = country;
  }

  if (body.slug != null || body.name != null) {
    data.slug = await ensureUniqueBranchSlug(
      String(body.slug || body.name || existing.name),
      id
    );
  }

  const nextCountry = String(data.country || existing.country);
  if (body.isDefault === true) {
    await prisma.branch.updateMany({
      where: { country: nextCountry, isDefault: true, NOT: { id } },
      data: { isDefault: false },
    });
    data.isDefault = true;
  } else if (body.isDefault === false) {
    data.isDefault = false;
  }

  const branch = await prisma.branch.update({ where: { id }, data });
  await writeAuditLog({
    actorId: ctx.userId,
    action: "branch.update",
    entityType: "Branch",
    entityId: branch.id,
    summary: `Updated branch ${branch.name}`,
    req,
    metadata: { fields: Object.keys(data) },
  });
  return NextResponse.json({ branch });
}

export async function DELETE(req: Request, { params }: Params) {
  const { ctx, error } = await requireAdminApi("branches.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isSuperAdmin) {
    return NextResponse.json(
      { error: "Only a Super Admin can delete branches." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const orderCount = await prisma.order.count({ where: { fulfillmentBranchId: id } });
  if (orderCount > 0) {
    return NextResponse.json(
      {
        error:
          "This branch has orders. Deactivate it instead of deleting.",
      },
      { status: 400 }
    );
  }

  const existing = await prisma.branch.findUnique({ where: { id } });
  await prisma.branch.delete({ where: { id } });
  await writeAuditLog({
    actorId: ctx.userId,
    action: "branch.delete",
    entityType: "Branch",
    entityId: id,
    summary: `Deleted branch ${existing?.name || id}`,
    req,
  });
  return NextResponse.json({ ok: true });
}
