import type { FinancialReportLine } from "@/lib/accounting-report-lines";

export type CompareMode = "none" | "prior_month" | "prior_year";

export function shiftMonthKey(monthKey: string, deltaMonths: number): string | null {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  const d = new Date(Date.UTC(y, m - 1 + deltaMonths, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function resolveCompareMonth(
  monthKey: string,
  mode: CompareMode
): string | null {
  if (mode === "none") return null;
  if (mode === "prior_month") return shiftMonthKey(monthKey, -1);
  return shiftMonthKey(monthKey, -12);
}

/** Merge two report line sets into side-by-side comparison columns. */
export function mergeReportLines(
  primary: FinancialReportLine[],
  compare: FinancialReportLine[]
): FinancialReportLine[] {
  const compareById = new Map(compare.map((line) => [line.id, line]));
  const order: string[] = [];
  const byId = new Map<string, FinancialReportLine>();

  for (const line of primary) {
    order.push(line.id);
    const cmp = compareById.get(line.id);
    byId.set(line.id, {
      ...line,
      amounts: [
        line.amounts[0] ?? null,
        cmp?.amounts[0] ?? line.amounts[1] ?? null,
      ],
      format: line.format ?? cmp?.format,
    });
  }

  for (const line of compare) {
    if (byId.has(line.id)) continue;
    order.push(line.id);
    byId.set(line.id, {
      ...line,
      amounts: [null, line.amounts[0] ?? null],
      format: line.format,
    });
  }

  return order.map((id) => byId.get(id)!);
}

export function supportsComparison(report: string): boolean {
  return report !== "trend";
}
