import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { parseShippingMethodInput } from "@/lib/shipping-methods";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const methods = await prisma.shippingMethod.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(methods);
}

export async function POST(req: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

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
  return NextResponse.json(method);
}
