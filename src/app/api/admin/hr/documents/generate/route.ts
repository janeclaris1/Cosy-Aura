import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { renderHrDocumentForEmployee } from "@/lib/hr-document";
import { hrCountryAccessible } from "@/lib/hr-scope";

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("hr.write");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const templateId = String(body.templateId || "").trim();
  const employeeProfileId = String(body.employeeProfileId || "").trim();
  const extra =
    body.extra && typeof body.extra === "object"
      ? (body.extra as Record<string, string>)
      : undefined;

  if (!templateId || !employeeProfileId) {
    return NextResponse.json(
      { error: "templateId and employeeProfileId are required" },
      { status: 400 }
    );
  }

  const [template, profile] = await Promise.all([
    prisma.hrDocumentTemplate.findFirst({
      where: { id: templateId, active: true },
    }),
    prisma.employeeProfile.findUnique({
      where: { id: employeeProfileId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            staffRole: true,
            staffCountry: true,
            staffAssignments: {
              select: { branch: { select: { name: true } } },
            },
          },
        },
      },
    }),
  ]);

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  if (!profile?.user) {
    return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
  }

  if (!hrCountryAccessible(ctx, profile.user.staffCountry)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const branches = profile.user.staffAssignments.map((a) => a.branch.name);
  const { renderedBody, mergeData } = renderHrDocumentForEmployee({
    template,
    employee: profile,
    user: profile.user,
    branches,
    extra,
  });

  const checklistProgress =
    template.kind === "CHECKLIST" && Array.isArray(template.checklistItems)
      ? Object.fromEntries(
          (
            template.checklistItems as Array<{ id: string }>
          ).map((item) => [item.id, false])
        )
      : undefined;

  const instance = await prisma.hrDocumentInstance.create({
    data: {
      templateId: template.id,
      employeeId: profile.id,
      renderedBody,
      mergeData,
      checklistProgress,
      generatedById: ctx.userId,
    },
    select: { id: true, generatedAt: true },
  });

  await writeAuditLog({
    actorId: ctx.userId,
    action: "hr.document.generate",
    entityType: "HrDocumentInstance",
    entityId: instance.id,
    summary: `Generated ${template.name} for ${profile.user.email}`,
    req,
    metadata: { templateId: template.id, employeeProfileId: profile.id },
  });

  return NextResponse.json({
    instanceId: instance.id,
    printUrl: `/admin/hr/documents/${instance.id}`,
  });
}
