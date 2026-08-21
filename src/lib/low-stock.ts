import { prisma } from "@/lib/prisma";
import { createAdminNotification } from "@/lib/notifications";

export function lowStockThreshold(): number {
  const n = Number(process.env.LOW_STOCK_THRESHOLD);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 5;
}

/**
 * Notify admins when a branch size qty is at/below threshold.
 * Dedupes: skips if an unread LOW_STOCK alert for the same link exists.
 */
export async function maybeNotifyLowStock(input: {
  branchId: string;
  branchName: string;
  fragranceId: string;
  productLabel: string;
  bottleSize: number;
  quantity: number;
}): Promise<void> {
  const threshold = lowStockThreshold();
  if (input.quantity > threshold) return;

  const link = `/admin/stock?branch=${encodeURIComponent(input.branchId)}`;
  const title =
    input.quantity <= 0
      ? `Out of stock · ${input.branchName}`
      : `Low stock · ${input.branchName}`;
  const message = `${input.productLabel} (${input.bottleSize}ml) is at ${input.quantity} (threshold ${threshold}).`;

  try {
    const recent = await prisma.adminNotification.findFirst({
      where: {
        type: "LOW_STOCK",
        link,
        message: { contains: `${input.productLabel} (${input.bottleSize}ml)` },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (recent) return;

    await createAdminNotification({
      type: "LOW_STOCK",
      title,
      message,
      link,
    });
  } catch (err) {
    console.error("[low-stock]", err);
  }
}

/** After stock writes, check each touched size row for alerts. */
export async function checkLowStockForRows(
  rows: Array<{
    branchId: string;
    branchName: string;
    fragranceId: string;
    bottleSize: number;
    quantity: number;
  }>
): Promise<void> {
  if (!rows.length) return;
  const fragranceIds = [...new Set(rows.map((r) => r.fragranceId))];
  const fragrances = await prisma.fragrance.findMany({
    where: { id: { in: fragranceIds } },
    select: { id: true, model: true, brand: { select: { name: true } } },
  });
  const labelById = new Map(
    fragrances.map((f) => [f.id, `${f.brand.name} ${f.model}`])
  );

  for (const row of rows) {
    await maybeNotifyLowStock({
      ...row,
      productLabel: labelById.get(row.fragranceId) || row.fragranceId,
    });
  }
}
