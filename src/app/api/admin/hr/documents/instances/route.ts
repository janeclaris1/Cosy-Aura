import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { hrCountryFilter } from "@/lib/hr-scope";

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("hr.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(
    100,
    Math.max(1, Number(new URL(req.url).searchParams.get("limit") || 40))
  );

  const country = hrCountryFilter(ctx);
  const instances = await prisma.hrDocumentInstance.findMany({
    where: country
      ? { employee: { user: { staffCountry: country } } }
      : undefined,
    orderBy: { generatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      generatedAt: true,
      template: { select: { name: true, category: true, kind: true } },
      employee: {
        select: {
          employeeNumber: true,
          user: { select: { name: true, email: true } },
        },
      },
      generatedBy: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({
    instances: instances.map((row) => ({
      id: row.id,
      generatedAt: row.generatedAt.toISOString(),
      templateName: row.template.name,
      category: row.template.category,
      kind: row.template.kind,
      employeeName:
        row.employee.user.name?.trim() || row.employee.user.email,
      employeeNumber: row.employee.employeeNumber,
      generatedBy:
        row.generatedBy?.name?.trim() || row.generatedBy?.email || null,
      printUrl: `/admin/hr/documents/${row.id}`,
    })),
  });
}
