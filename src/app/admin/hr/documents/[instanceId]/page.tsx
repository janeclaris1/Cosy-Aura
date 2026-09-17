import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { HrDocumentPrintClient } from "@/components/admin/HrDocumentPrintClient";
import { buildHrDocumentSheetProps } from "@/lib/hr-document";
import { hasPermission } from "@/lib/rbac";

export default async function HrDocumentPrintPage({
  params,
}: {
  params: { instanceId: string };
}) {
  const ctx = await requireAdminPage("hr.read");
  const canEditChecklist = hasPermission(ctx.permissions, "hr.write");

  const instance = await prisma.hrDocumentInstance.findUnique({
    where: { id: params.instanceId },
    include: {
      template: true,
      employee: {
        include: {
          user: { select: { name: true, email: true, staffCountry: true } },
        },
      },
    },
  });

  if (!instance) notFound();

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

  return (
    <HrDocumentPrintClient
      instanceId={instance.id}
      initialSheet={sheet}
      canEditChecklist={canEditChecklist}
    />
  );
}
