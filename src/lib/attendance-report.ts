import "server-only";

import type { Prisma } from "@prisma/client";
import type { AdminContext } from "@/lib/admin";
import { scopedBranchIds } from "@/lib/admin";
import { branchDayKey, branchTimezone } from "@/lib/attendance";
import { staffRoleNeedsCountry } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export type AttendanceReportRow = {
  id: string;
  dayKey: string;
  punchedAt: string;
  staffName: string;
  staffEmail: string;
  branchName: string;
  branchCountry: string;
  punchType: string;
  source: string;
  deviceName: string | null;
  note: string | null;
  recordedBy: string | null;
};

export type AttendanceReportSummary = {
  totalPunches: number;
  uniqueStaff: number;
  clockIns: number;
  clockOuts: number;
};

function parseDayKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

function defaultFromDay(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultToDay(): string {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeAttendanceReportRange(input: {
  from?: string | null;
  to?: string | null;
}): { fromDay: string; toDay: string } {
  let fromDay = parseDayKey(input.from) || defaultFromDay();
  let toDay = parseDayKey(input.to) || defaultToDay();
  if (fromDay > toDay) {
    const swap = fromDay;
    fromDay = toDay;
    toDay = swap;
  }
  return { fromDay, toDay };
}

export async function resolveAttendanceReportBranchIds(
  ctx: AdminContext,
  branchId?: string | null
): Promise<{ branchIds: string[]; error?: string }> {
  const scope = scopedBranchIds(ctx);

  if (branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, active: true },
      select: { id: true, country: true },
    });
    if (!branch) return { branchIds: [], error: "Branch not found" };

    if (scope !== "all" && !scope.includes(branch.id)) {
      return { branchIds: [], error: "You are not assigned to this branch" };
    }
    if (
      staffRoleNeedsCountry(ctx.staffRole) &&
      ctx.staffCountry &&
      branch.country.toUpperCase() !== ctx.staffCountry.toUpperCase()
    ) {
      return { branchIds: [], error: "Branch is outside your country scope" };
    }
    return { branchIds: [branch.id] };
  }

  if (scope === "all") {
    const where: Prisma.BranchWhereInput = { active: true };
    if (staffRoleNeedsCountry(ctx.staffRole) && ctx.staffCountry) {
      where.country = ctx.staffCountry;
    }
    const branches = await prisma.branch.findMany({
      where,
      select: { id: true },
    });
    return { branchIds: branches.map((b) => b.id) };
  }

  return { branchIds: scope };
}

export async function fetchAttendanceReport(
  ctx: AdminContext,
  options: { branchId?: string | null; from?: string | null; to?: string | null }
): Promise<
  | {
      ok: true;
      fromDay: string;
      toDay: string;
      rows: AttendanceReportRow[];
      summary: AttendanceReportSummary;
    }
  | { ok: false; error: string }
> {
  const { fromDay, toDay } = normalizeAttendanceReportRange(options);
  const { branchIds, error } = await resolveAttendanceReportBranchIds(
    ctx,
    options.branchId
  );
  if (error) return { ok: false, error };
  if (!branchIds.length) {
    return {
      ok: true,
      fromDay,
      toDay,
      rows: [],
      summary: { totalPunches: 0, uniqueStaff: 0, clockIns: 0, clockOuts: 0 },
    };
  }

  const fromUtc = new Date(`${fromDay}T00:00:00.000Z`);
  const toUtc = new Date(`${toDay}T23:59:59.999Z`);

  const punches = await prisma.attendancePunch.findMany({
    where: {
      branchId: { in: branchIds },
      punchedAt: { gte: fromUtc, lte: toUtc },
    },
    include: {
      user: { select: { name: true, email: true } },
      branch: { select: { name: true, country: true } },
      device: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: [{ punchedAt: "desc" }],
    take: 15000,
  });

  const staffIds = new Set<string>();
  let clockIns = 0;
  let clockOuts = 0;

  const rows: AttendanceReportRow[] = punches.map((p) => {
    staffIds.add(p.userId);
    if (p.punchType === "CLOCK_IN") clockIns += 1;
    if (p.punchType === "CLOCK_OUT") clockOuts += 1;
    const tz = branchTimezone(p.branch.country);
    return {
      id: p.id,
      dayKey: branchDayKey(p.punchedAt, tz),
      punchedAt: p.punchedAt.toISOString(),
      staffName: p.user.name || p.user.email,
      staffEmail: p.user.email,
      branchName: p.branch.name,
      branchCountry: p.branch.country,
      punchType: p.punchType,
      source: p.source,
      deviceName: p.device?.name || null,
      note: p.note,
      recordedBy: p.createdBy
        ? p.createdBy.name || p.createdBy.email
        : null,
    };
  });

  return {
    ok: true,
    fromDay,
    toDay,
    rows,
    summary: {
      totalPunches: rows.length,
      uniqueStaff: staffIds.size,
      clockIns,
      clockOuts,
    },
  };
}
