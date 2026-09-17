import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await requireAdminApi("hr.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const template = await prisma.hrDocumentTemplate.findFirst({
    where: { id: params.id, active: true },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ template });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await requireAdminApi("hr.write");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = body.name != null ? String(body.name).trim() : undefined;
  const templateBody = body.body != null ? String(body.body) : undefined;
  const checklistItems = body.checklistItems;

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  }

  const existing = await prisma.hrDocumentTemplate.findFirst({
    where: { id: params.id, active: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const updated = await prisma.hrDocumentTemplate.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(templateBody !== undefined ? { body: templateBody } : {}),
      ...(checklistItems !== undefined ? { checklistItems } : {}),
      version: { increment: 1 },
    },
  });

  await writeAuditLog({
    actorId: ctx.userId,
    action: "hr.template.update",
    entityType: "HrDocumentTemplate",
    entityId: updated.id,
    summary: `Updated HR template ${updated.name}`,
    req,
  });

  return NextResponse.json({ template: updated });
}
