import type { PrismaClient } from "@prisma/client";
import { DEFAULT_HR_TEMPLATES } from "@/lib/hr-document-templates-default";

export async function ensureDefaultHrTemplates(prisma: PrismaClient): Promise<void> {
  for (const template of DEFAULT_HR_TEMPLATES) {
    await prisma.hrDocumentTemplate.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name,
        category: template.category,
        kind: template.kind,
        country: template.country ?? "GH",
        staffRole: template.staffRole ?? null,
        employmentType: template.employmentType ?? null,
        body: template.body,
        checklistItems: template.checklistItems ?? undefined,
        sortOrder: template.sortOrder,
        active: true,
      },
      create: {
        slug: template.slug,
        name: template.name,
        category: template.category,
        kind: template.kind,
        country: template.country ?? "GH",
        staffRole: template.staffRole ?? null,
        employmentType: template.employmentType ?? null,
        body: template.body,
        checklistItems: template.checklistItems ?? undefined,
        sortOrder: template.sortOrder,
        active: true,
      },
    });
  }
}
