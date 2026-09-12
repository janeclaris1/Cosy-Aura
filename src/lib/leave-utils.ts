/** Working days Mon–Sat between two ISO date strings (YYYY-MM-DD). */
export function workingDaysBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  if (e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    if (cur.getDay() !== 0) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(count, 0.5);
}

export const EMPLOYEE_LEAVE_TYPES = [
  "ANNUAL",
  "SICK",
  "MATERNITY",
  "PATERNITY",
  "COMPASSIONATE",
  "UNPAID",
] as const;

export type EmployeeLeaveType = (typeof EMPLOYEE_LEAVE_TYPES)[number];

export function isEmployeeLeaveType(value: string): value is EmployeeLeaveType {
  return (EMPLOYEE_LEAVE_TYPES as readonly string[]).includes(value);
}
