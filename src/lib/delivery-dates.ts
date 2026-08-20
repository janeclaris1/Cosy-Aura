const ACCRA_TZ = "Africa/Accra";

export type DeliveryDateOption = {
  iso: string;
  label: string;
};

function todayIsoInAccra(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ACCRA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

function weekdayUtcIso(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Sunday = 0. Delivery runs Monday-Saturday. */
export function isDeliveryWeekday(iso: string): boolean {
  return weekdayUtcIso(iso) !== 0;
}

export function earliestDeliveryIso(now = new Date()): string {
  let iso = addDaysIso(todayIsoInAccra(now), 1);
  while (!isDeliveryWeekday(iso)) {
    iso = addDaysIso(iso, 1);
  }
  return iso;
}

export function formatDeliveryDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function listUpcomingDeliveryDates(count = 18, now = new Date()): DeliveryDateOption[] {
  const options: DeliveryDateOption[] = [];
  let iso = earliestDeliveryIso(now);
  while (options.length < count) {
    if (isDeliveryWeekday(iso)) {
      options.push({ iso, label: formatDeliveryDateLabel(iso) });
    }
    iso = addDaysIso(iso, 1);
  }
  return options;
}

export function parseDeliveryDate(input: unknown): Date | null {
  const iso = String(input || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  if (!isDeliveryWeekday(iso)) return null;
  const earliest = earliestDeliveryIso();
  if (iso < earliest) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function deliveryDateIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}
