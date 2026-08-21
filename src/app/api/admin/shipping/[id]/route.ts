import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { parseShippingMethodInput } from "@/lib/shipping-methods";
import { slugify } from "@/lib/utils";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await requireAdminApi("shipping.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = parseShippingMethodInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const slug = slugify(parsed.data.name);
  const conflict = await prisma.shippingMethod.findFirst({
    where: { slug, NOT: { id: params.id } },
  });
  if (conflict) {
    return NextResponse.json(
      { error: "A shipping method with this name already exists" },
      { status: 400 }
    );
  }

  const method = await prisma.shippingMethod.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      slug,
    },
  });

  await writeAuditLog({
    actorId: ctx.userId,
    action: "shipping.update",
    entityType: "ShippingMethod",
    entityId: method.id,
    summary: `Updated shipping method ${method.name}`,
    req,
  });

  return NextResponse.json(method);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await requireAdminApi("shipping.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enabledCount = await prisma.shippingMethod.count({
    where: { enabled: true },
  });
  const target = await prisma.shippingMethod.findUnique({
    where: { id: params.id },
  });

  if (!target) {
    return NextResponse.json({ error: "Shipping method not found" }, { status: 404 });
  }

  if (target.enabled && enabledCount <= 1) {
    return NextResponse.json(
      { error: "At least one enabled shipping method is required" },
      { status: 400 }
    );
  }

  await prisma.shippingMethod.delete({ where: { id: params.id } });
  await writeAuditLog({
    actorId: ctx.userId,
    action: "shipping.delete",
    entityType: "ShippingMethod",
    entityId: params.id,
    summary: `Deleted shipping method ${target.name}`,
    req,
  });
  return NextResponse.json({ ok: true });
}
