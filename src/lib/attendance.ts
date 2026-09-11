import type {
  AttendancePunchType,
  AttendanceSource,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminContext } from "@/lib/admin";
import { scopedBranchIds } from "@/lib/admin";

export type AttendanceStatus = "IN" | "OUT" | "NONE";

export type TodayStaffRow = {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  status: AttendanceStatus;
  clockInAt: string | null;
  clockOutAt: string | null;
  lastPunchAt: string | null;
  lastPunchType: AttendancePunchType | null;
  punchCount: number;
};

export function branchTimezone(country: string): string {
  if (country.toUpperCase() === "CM") return "Africa/Douala";
  return "Africa/Accra";
}

export function branchDayKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** UTC instants bounding a branch-local calendar day. */
export function branchDayBounds(dayKey: string, timezone: string): {
  start: Date;
  end: Date;
} {
  const [y, m, d] = dayKey.split("-").map(Number);
  const utcGuess = Date.UTC(y, m - 1, d, 0, 0, 0);
  const offsetMs = getTimezoneOffsetMs(new Date(utcGuess), timezone);
  const start = new Date(utcGuess - offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
  const second = Number(parts.find((p) => p.type === "second")?.value || 0);
  const asUtc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    hour,
    minute,
    second
  );
  return asUtc - date.getTime();
}

export async function assertAttendanceBranchAccess(
  ctx: AdminContext,
  branchId: string
): Promise<
  | { ok: true; branch: { id: string; name: string; country: string } }
  | { ok: false; reason: string }
> {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, active: true },
    select: { id: true, name: true, country: true },
  });
  if (!branch) return { ok: false, reason: "Branch not found" };

  const scope = scopedBranchIds(ctx);
  if (scope === "all") {
    if (ctx.staffRole === "COUNTRY_MANAGER" && ctx.staffCountry) {
      if (branch.country.toUpperCase() !== ctx.staffCountry.toUpperCase()) {
        return { ok: false, reason: "Branch is outside your country scope" };
      }
    }
    return { ok: true, branch };
  }

  if (!scope.includes(branchId)) {
    return { ok: false, reason: "You are not assigned to this branch" };
  }
  return { ok: true, branch };
}

function deriveStatusFromPunches(
  punches: { punchType: AttendancePunchType; punchedAt: Date }[]
): {
  status: AttendanceStatus;
  clockInAt: Date | null;
  clockOutAt: Date | null;
  lastPunchAt: Date | null;
  lastPunchType: AttendancePunchType | null;
} {
  if (!punches.length) {
    return {
      status: "NONE",
      clockInAt: null,
      clockOutAt: null,
      lastPunchAt: null,
      lastPunchType: null,
    };
  }

  const sorted = [...punches].sort(
    (a, b) => a.punchedAt.getTime() - b.punchedAt.getTime()
  );
  const last = sorted[sorted.length - 1];
  const firstIn = sorted.find((p) => p.punchType === "CLOCK_IN") || null;
  const lastOut = [...sorted]
    .reverse()
    .find((p) => p.punchType === "CLOCK_OUT") || null;

  return {
    status: last.punchType === "CLOCK_IN" ? "IN" : "OUT",
    clockInAt: firstIn?.punchedAt || null,
    clockOutAt: lastOut?.punchedAt || null,
    lastPunchAt: last.punchedAt,
    lastPunchType: last.punchType,
  };
}

export async function getTodayAttendance(
  branchId: string,
  dayKey?: string
): Promise<{ dayKey: string; timezone: string; rows: TodayStaffRow[] }> {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { country: true },
  });
  if (!branch) {
    return { dayKey: dayKey || "", timezone: "Africa/Accra", rows: [] };
  }

  const timezone = branchTimezone(branch.country);
  const key = dayKey || branchDayKey(new Date(), timezone);
  const { start, end } = branchDayBounds(key, timezone);

  const [assignedIds, punches] = await Promise.all([
    prisma.staffAssignment.findMany({
      where: { branchId },
      select: { userId: true },
    }),
    prisma.attendancePunch.findMany({
      where: {
        branchId,
        punchedAt: { gte: start, lte: end },
      },
      orderBy: { punchedAt: "asc" },
      select: {
        userId: true,
        punchType: true,
        punchedAt: true,
      },
    }),
  ]);

  const assignedUserIds = assignedIds.map((a) => a.userId);
  const staff = await prisma.user.findMany({
    where: {
      role: "ADMIN",
      activeStaff: { not: false },
      OR: [
        ...(assignedUserIds.length
          ? [{ id: { in: assignedUserIds } }]
          : []),
        {
          staffRole: "COUNTRY_MANAGER",
          staffCountry: { equals: branch.country, mode: "insensitive" as const },
        },
        { staffRole: null },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  const punchesByUser = new Map<string, typeof punches>();
  for (const punch of punches) {
    const list = punchesByUser.get(punch.userId) || [];
    list.push(punch);
    punchesByUser.set(punch.userId, list);
  }

  const seen = new Set<string>();
  const rows: TodayStaffRow[] = staff
    .filter((user) => {
      if (seen.has(user.id)) return false;
      seen.add(user.id);
      return true;
    })
    .map((user) => {
      const userPunches = punchesByUser.get(user.id) || [];
      const derived = deriveStatusFromPunches(userPunches);
      return {
        userId: user.id,
        name: user.name || user.email,
        email: user.email,
        image: user.image,
        status: derived.status,
        clockInAt: derived.clockInAt?.toISOString() || null,
        clockOutAt: derived.clockOutAt?.toISOString() || null,
        lastPunchAt: derived.lastPunchAt?.toISOString() || null,
        lastPunchType: derived.lastPunchType,
        punchCount: userPunches.length,
      };
    })
    .sort((a, b) => {
      if (a.status === "IN" && b.status !== "IN") return -1;
      if (b.status === "IN" && a.status !== "IN") return 1;
      return a.name.localeCompare(b.name);
    });

  return { dayKey: key, timezone, rows };
}

export async function inferNextPunchType(
  userId: string,
  branchId: string,
  dayKey: string,
  timezone: string
): Promise<AttendancePunchType> {
  const { start, end } = branchDayBounds(dayKey, timezone);
  const last = await prisma.attendancePunch.findFirst({
    where: {
      userId,
      branchId,
      punchedAt: { gte: start, lte: end },
    },
    orderBy: { punchedAt: "desc" },
    select: { punchType: true },
  });
  if (!last || last.punchType === "CLOCK_OUT") return "CLOCK_IN";
  return "CLOCK_OUT";
}

export async function recordAttendancePunch(input: {
  userId: string;
  branchId: string;
  punchType?: AttendancePunchType | "AUTO";
  source: AttendanceSource;
  punchedAt?: Date;
  deviceId?: string | null;
  externalId?: string | null;
  note?: string | null;
  createdById?: string | null;
}): Promise<
  | { ok: true; punchId: string; punchType: AttendancePunchType }
  | { ok: false; reason: string }
> {
  const branch = await prisma.branch.findFirst({
    where: { id: input.branchId, active: true },
    select: { id: true, country: true },
  });
  if (!branch) return { ok: false, reason: "Branch not found" };

  const user = await prisma.user.findFirst({
    where: {
      id: input.userId,
      role: "ADMIN",
      activeStaff: { not: false },
    },
    select: { id: true },
  });
  if (!user) return { ok: false, reason: "Staff member not found" };

  const punchedAt = input.punchedAt || new Date();
  const timezone = branchTimezone(branch.country);
  const dayKey = branchDayKey(punchedAt, timezone);

  let punchType = input.punchType;
  if (!punchType || punchType === "AUTO") {
    punchType = await inferNextPunchType(
      input.userId,
      input.branchId,
      dayKey,
      timezone
    );
  }

  if (input.deviceId && input.externalId) {
    const existing = await prisma.attendancePunch.findUnique({
      where: {
        deviceId_externalId: {
          deviceId: input.deviceId,
          externalId: input.externalId,
        },
      },
      select: { id: true, punchType: true },
    });
    if (existing) {
      return { ok: true, punchId: existing.id, punchType: existing.punchType };
    }
  }

  const punch = await prisma.attendancePunch.create({
    data: {
      userId: input.userId,
      branchId: input.branchId,
      deviceId: input.deviceId || null,
      punchType,
      source: input.source,
      punchedAt,
      externalId: input.externalId || null,
      note: input.note?.trim() || null,
      createdById: input.createdById || null,
    },
    select: { id: true, punchType: true },
  });

  if (input.deviceId) {
    await prisma.attendanceDevice.update({
      where: { id: input.deviceId },
      data: { lastSyncAt: new Date() },
    }).catch(() => undefined);
  }

  return { ok: true, punchId: punch.id, punchType: punch.punchType };
}

export async function resolveEnrollment(
  deviceId: string,
  deviceUserId: string
): Promise<
  | { ok: true; userId: string; branchId: string }
  | { ok: false; reason: string }
> {
  const enrollment = await prisma.attendanceEnrollment.findFirst({
    where: {
      deviceId,
      deviceUserId: String(deviceUserId).trim(),
      active: true,
      device: { active: true },
    },
    include: {
      device: { select: { branchId: true } },
    },
  });
  if (!enrollment) {
    return { ok: false, reason: "No active enrollment for this device user" };
  }
  return {
    ok: true,
    userId: enrollment.userId,
    branchId: enrollment.device.branchId,
  };
}
