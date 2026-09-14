import { NextResponse } from "next/server";
import type { FragranceFamily } from "@prisma/client";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const FAMILIES: FragranceFamily[] = [
  "FLORAL",
  "ORIENTAL",
  "WOODY",
  "FRESH",
  "CITRUS",
  "SPICY",
];

export async function GET() {
  const { error } = await requireAdminApi("hr.read");
  if (error) return error;

  const rules = await prisma.commissionCategoryRule.findMany({
    orderBy: [{ country: "asc" }, { fragranceFamily: "asc" }],
  });

  return NextResponse.json({ rules, families: FAMILIES });
}

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("hr.write");
  if (error) return error;

  const body = await req.json();
  const fragranceFamily = String(body.fragranceFamily || "").trim() as FragranceFamily;
  if (!FAMILIES.includes(fragranceFamily)) {
    return NextResponse.json({ error: "Invalid scent family" }, { status: 400 });
  }

  const ratePercent = Number(body.ratePercent);
  if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) {
    return NextResponse.json({ error: "Rate must be between 0 and 100" }, { status: 400 });
  }

  const country = String(body.country || "ALL")
    .trim()
    .toUpperCase();
  if (!["ALL", "GH", "CM"].includes(country)) {
    return NextResponse.json({ error: "Country must be ALL, GH, or CM" }, { status: 400 });
  }

  const active = body.active !== false;

  const rule = await prisma.commissionCategoryRule.upsert({
    where: {
      fragranceFamily_country: { fragranceFamily, country },
    },
    create: { fragranceFamily, country, ratePercent, active },
    update: { ratePercent, active },
  });

  await writeAuditLog({
    actorId: ctx.userId,
    action: "commission.rule.upsert",
    entityType: "CommissionCategoryRule",
    entityId: rule.id,
    summary: `${fragranceFamily} @ ${ratePercent}% (${country})`,
    req,
  });

  return NextResponse.json({ rule });
}

export async function PATCH(req: Request) {
  const { ctx, error } = await requireAdminApi("hr.write");
  if (error) return error;

  const body = await req.json();
  const id = String(body.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const data: { active?: boolean; ratePercent?: number } = {};
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.ratePercent !== undefined) {
    const ratePercent = Number(body.ratePercent);
    if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) {
      return NextResponse.json({ error: "Invalid rate" }, { status: 400 });
    }
    data.ratePercent = ratePercent;
  }

  const rule = await prisma.commissionCategoryRule.update({
    where: { id },
    data,
  });

  await writeAuditLog({
    actorId: ctx.userId,
    action: "commission.rule.update",
    entityType: "CommissionCategoryRule",
    entityId: rule.id,
    summary: `Updated commission rule ${rule.fragranceFamily}`,
    req,
  });

  return NextResponse.json({ rule });
}
