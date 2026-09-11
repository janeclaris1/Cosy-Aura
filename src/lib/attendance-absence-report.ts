import "server-only";

import type { AdminContext } from "@/lib/admin";
import { branchDayKey, branchTimezone } from "@/lib/attendance";
import { resolveAttendanceReportBranchIds } from "@/lib/attendance-report";
import { prisma } from "@/lib/prisma";

export type MonthlyAbsenceRow = {
  month: string;
  userId: string;
  staffName: string;
  staffEmail: string;
  branches: string;
  workingDays: number;
  presentDays: number;
  absentDays: number;
};

function parseMonthKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

export function defaultMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function normalizeMonthRange(input: {
  month?: string | null;
  fromMonth?: string | null;
  toMonth?: string | null;
}): { fromMonth: string; toMonth: string } {
  const single = parseMonthKey(input.month);
  if (single) return { fromMonth: single, toMonth: single };

  let fromMonth = parseMonthKey(input.fromMonth) || defaultMonthKey();
  let toMonth = parseMonthKey(input.toMonth) || fromMonth;
  if (fromMonth > toMonth) {
    const swap = fromMonth;
    fromMonth = toMonth;
    toMonth = swap;
  }
  return { fromMonth, toMonth };
}

function monthKeysBetween(fromMonth: string, toMonth: string): string[] {
  const [fy, fm] = fromMonth.split("-").map(Number);
  const [ty, tm] = toMonth.split("-").map(Number);
  const keys: string[] = [];
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return keys;
}

function weekdayInTimezone(dayKey: string, timezone: string): number {
  const [y, mo, d] = dayKey.split("-").map(Number);
  const noon = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  const name = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: timezone,
  }).format(noon);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[name] ?? 0;
}

/** Mon–Sat working days in a calendar month, capped at today in branch timezone. */
function workingDaysInMonth(
  monthKey: string,
  timezone: string
): string[] {
  const [y, m] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const todayKey = branchDayKey(new Date(), timezone);
  const sameMonth = todayKey.startsWith(`${monthKey}-`);
  const cap = sameMonth ? todayKey : `${monthKey}-${String(daysInMonth).padStart(2, "0")}`;

  const days: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayKey = `${monthKey}-${String(d).padStart(2, "0")}`;
    if (dayKey > cap) break;
    const dow = weekdayInTimezone(dayKey, timezone);
    if (dow === 0) continue;
    days.push(dayKey);
  }
  return days;
}

function monthUtcBounds(monthKey: string): { start: Date; end: Date } {
  const [y, m] = monthKey.split("-").map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)),
  };
}

async function loadStaffForBranches(
  branchIds: string[]
): Promise<
  Map<
    string,
    { id: string; name: string; email: string; branches: Set<string> }
  >
> {
  const branches = await prisma.branch.findMany({
    where: { id: { in: branchIds }, active: true },
    select: { id: true, name: true, country: true },
  });

  const users = new Map<
    string,
    { id: string; name: string; email: string; branches: Set<string> }
  >();

  for (const branch of branches) {
    const assignments = await prisma.staffAssignment.findMany({
      where: { branchId: branch.id },
      select: { userId: true },
    });
    const assignedIds = assignments.map((a) => a.userId);

    const staff = await prisma.user.findMany({
      where: {
        role: "ADMIN",
        activeStaff: { not: false },
        OR: [
          ...(assignedIds.length ? [{ id: { in: assignedIds } }] : []),
          {
            staffRole: "COUNTRY_MANAGER",
            staffCountry: {
              equals: branch.country,
              mode: "insensitive" as const,
            },
          },
          { staffRole: null },
        ],
      },
      select: { id: true, name: true, email: true },
    });

    for (const user of staff) {
      const existing = users.get(user.id);
      if (existing) {
        existing.branches.add(branch.name);
      } else {
        users.set(user.id, {
          id: user.id,
          name: user.name || user.email,
          email: user.email,
          branches: new Set([branch.name]),
        });
      }
    }
  }

  return users;
}

export async function fetchMonthlyAbsenceReport(
  ctx: AdminContext,
  options: {
    branchId?: string | null;
    month?: string | null;
    fromMonth?: string | null;
    toMonth?: string | null;
  }
): Promise<
  | { ok: true; fromMonth: string; toMonth: string; rows: MonthlyAbsenceRow[] }
  | { ok: false; error: string }
> {
  const { fromMonth, toMonth } = normalizeMonthRange(options);
  const { branchIds, error } = await resolveAttendanceReportBranchIds(
    ctx,
    options.branchId
  );
  if (error) return { ok: false, error };

  if (!branchIds.length) {
    return { ok: true, fromMonth, toMonth, rows: [] };
  }

  const branches = await prisma.branch.findMany({
    where: { id: { in: branchIds }, active: true },
    select: { id: true, name: true, country: true },
  });
  const primaryTz = branchTimezone(branches[0]?.country || "GH");
  const staffMap = await loadStaffForBranches(branchIds);
  const monthKeys = monthKeysBetween(fromMonth, toMonth);

  const rows: MonthlyAbsenceRow[] = [];

  for (const monthKey of monthKeys) {
    const workingDays = workingDaysInMonth(monthKey, primaryTz);
    const { start, end } = monthUtcBounds(monthKey);

    const clockIns = await prisma.attendancePunch.findMany({
      where: {
        branchId: { in: branchIds },
        punchType: "CLOCK_IN",
        punchedAt: { gte: start, lte: end },
      },
      select: {
        userId: true,
        punchedAt: true,
        branch: { select: { country: true } },
      },
    });

    const presentByUserDay = new Set<string>();
    for (const punch of clockIns) {
      const tz = branchTimezone(punch.branch.country);
      const dayKey = branchDayKey(punch.punchedAt, tz);
      if (!dayKey.startsWith(`${monthKey}-`)) continue;
      presentByUserDay.add(`${punch.userId}:${dayKey}`);
    }

    for (const user of staffMap.values()) {
      let presentDays = 0;
      for (const dayKey of workingDays) {
        if (presentByUserDay.has(`${user.id}:${dayKey}`)) presentDays += 1;
      }
      const workingDayCount = workingDays.length;
      rows.push({
        month: monthKey,
        userId: user.id,
        staffName: user.name,
        staffEmail: user.email,
        branches: [...user.branches].sort().join(", "),
        workingDays: workingDayCount,
        presentDays,
        absentDays: Math.max(0, workingDayCount - presentDays),
      });
    }
  }

  rows.sort((a, b) => {
    if (a.month !== b.month) return b.month.localeCompare(a.month);
    if (b.absentDays !== a.absentDays) return b.absentDays - a.absentDays;
    return a.staffName.localeCompare(b.staffName);
  });

  return { ok: true, fromMonth, toMonth, rows };
}
