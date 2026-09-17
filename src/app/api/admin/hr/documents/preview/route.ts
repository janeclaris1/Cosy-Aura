import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { buildHrDocumentSheetProps, renderHrDocumentForEmployee } from "@/lib/hr-document";
import { mergeAndFormatHrDocumentBody } from "@/lib/hr-document-body";
import { sampleHrMergeFields } from "@/lib/hr-document-merge";

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("hr.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const templateId = String(body.templateId || "").trim();
  const employeeProfileId = body.employeeProfileId
    ? String(body.employeeProfileId).trim()
    : null;
  const templateBodyOverride =
    body.body != null ? String(body.body) : undefined;

  if (!templateId) {
    return NextResponse.json({ error: "templateId is required" }, { status: 400 });
  }

  const template = await prisma.hrDocumentTemplate.findFirst({
    where: { id: templateId, active: true },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const effectiveTemplate = templateBodyOverride
    ? { ...template, body: templateBodyOverride }
    : template;

  let renderedBody: string;
  let employeeName: string;
  let country = template.country || "GH";

  if (employeeProfileId) {
    const profile = await prisma.employeeProfile.findUnique({
      where: { id: employeeProfileId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            staffRole: true,
            staffCountry: true,
            staffAssignments: { select: { branch: { select: { name: true } } } },
          },
        },
      },
    });
    if (!profile?.user) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const result = renderHrDocumentForEmployee({
      template: effectiveTemplate,
      employee: profile,
      user: profile.user,
      branches: profile.user.staffAssignments.map((a) => a.branch.name),
    });
    renderedBody = result.renderedBody;
    employeeName = profile.user.name?.trim() || profile.user.email;
    country = profile.user.staffCountry || country;
  } else {
    const fields = sampleHrMergeFields(country);
    renderedBody = mergeAndFormatHrDocumentBody(effectiveTemplate.body, fields);
    employeeName = fields["employee.name"];
  }

  const sheet = buildHrDocumentSheetProps({
    template: effectiveTemplate,
    renderedBody,
    employeeName,
    country,
    checklistProgress:
      effectiveTemplate.kind === "CHECKLIST" &&
      Array.isArray(effectiveTemplate.checklistItems)
        ? Object.fromEntries(
            (
              effectiveTemplate.checklistItems as Array<{ id: string }>
            ).map((item) => [item.id, false])
          )
        : undefined,
  });

  return NextResponse.json({ sheet, sample: !employeeProfileId });
}
