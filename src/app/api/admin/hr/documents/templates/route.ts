import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { ensureDefaultHrTemplates } from "@/lib/hr-document-seed";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { ctx, error } = await requireAdminApi("hr.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureDefaultHrTemplates(prisma);

  const templates = await prisma.hrDocumentTemplate.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      kind: true,
      country: true,
      staffRole: true,
      employmentType: true,
      version: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ templates });
}
