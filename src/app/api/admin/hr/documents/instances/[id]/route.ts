import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { buildHrDocumentSheetProps } from "@/lib/hr-document";
import { hrCountryAccessible } from "@/lib/hr-scope";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await requireAdminApi("hr.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const instance = await prisma.hrDocumentInstance.findUnique({
    where: { id: params.id },
    include: {
      template: true,
      employee: {
        include: {
          user: { select: { name: true, email: true, staffCountry: true } },
        },
      },
    },
  });

  if (!instance) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (!hrCountryAccessible(ctx, instance.employee.user.staffCountry)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sheet = buildHrDocumentSheetProps({
    template: instance.template,
    renderedBody: instance.renderedBody,
    employeeName:
      instance.employee.user.name?.trim() || instance.employee.user.email,
    country: instance.employee.user.staffCountry || instance.template.country,
    checklistProgress:
      (instance.checklistProgress as Record<string, boolean> | null) ?? undefined,
    generatedAt: instance.generatedAt,
  });

  return NextResponse.json({
    instance: {
      id: instance.id,
      generatedAt: instance.generatedAt.toISOString(),
      checklistProgress: instance.checklistProgress,
    },
    sheet,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await requireAdminApi("hr.write");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.hrDocumentInstance.findUnique({
    where: { id: params.id },
    select: {
      employee: { select: { user: { select: { staffCountry: true } } } },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (!hrCountryAccessible(ctx, existing.employee.user.staffCountry)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const checklistProgress = body.checklistProgress;
  if (!checklistProgress || typeof checklistProgress !== "object") {
    return NextResponse.json(
      { error: "checklistProgress object required" },
      { status: 400 }
    );
  }

  const updated = await prisma.hrDocumentInstance.update({
    where: { id: params.id },
    data: { checklistProgress },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: updated.id });
}
