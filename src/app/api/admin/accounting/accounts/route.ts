import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { ensureGhanaCoa } from "@/lib/accounting";
import { GH_ACCOUNTING_COUNTRY } from "@/lib/accounting-gh-coa";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { ctx, error } = await requireAdminApi("accounting.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureGhanaCoa();

  const accounts = await prisma.glAccount.findMany({
    where: { country: GH_ACCOUNTING_COUNTRY, active: true },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      description: true,
    },
  });

  return NextResponse.json({ accounts, country: GH_ACCOUNTING_COUNTRY });
}
