import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { parseShippingMethodInput } from "@/lib/shipping-methods";

export async function GET() {
  const { error } = await requireAdminApi("shipping.write");
  if (error) return error;

  const methods = await prisma.shippingMethod.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(methods);
}

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("shipping.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = parseShippingMethodInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const existing = await prisma.shippingMethod.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A shipping method with this name already exists" },
      { status: 400 }
    );
  }

  const method = await prisma.shippingMethod.create({ data: parsed.data });
  await writeAuditLog({
    actorId: ctx.userId,
    action: "shipping.create",
    entityType: "ShippingMethod",
    entityId: method.id,
    summary: `Created shipping method ${method.name}`,
    req,
  });
  return NextResponse.json(method);
}
