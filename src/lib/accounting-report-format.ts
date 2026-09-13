/** Format amounts like standard financial statements (space thousands, dash for zero). */
export function formatReportAmount(
  value: number | null | undefined,
  options?: { dashZero?: boolean; decimals?: number }
): string {
  const dashZero = options?.dashZero !== false;
  if (value == null || (value === 0 && dashZero)) return "–";

  const negative = value < 0;
  const abs = Math.abs(value);
  const decimals = options?.decimals ?? (Number.isInteger(abs) ? 0 : 2);

  const parts = abs.toFixed(decimals).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const body = decimals > 0 ? `${parts[0]}.${parts[1]}` : parts[0];

  return negative ? `- ${body}` : body;
}

export function formatReportPeriodLabel(monthKey: string, mode: "month" | "as-of" = "month") {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return monthKey;
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  return mode === "as-of" ? `As of ${label}` : label;
}

export function formatReportShortMonth(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return monthKey;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export const FINANCIAL_REPORT_COMPANY = "Cosy Aura";
export const FINANCIAL_REPORT_CURRENCY = "GHS";
