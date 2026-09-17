import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { bulkEmployeeImportCsvTemplate } from "@/lib/hr-document-templates-default";

export async function GET() {
  const { ctx, error } = await requireAdminApi("hr.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const csv = bulkEmployeeImportCsvTemplate();
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cosy-aura-employee-import-template.csv"',
    },
  });
}
