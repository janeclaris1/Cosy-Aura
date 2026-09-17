import type { PrismaClient } from "@prisma/client";
import type { BottleSize } from "../../src/lib/bottle-sizes";

/**
 * Upsert branch stock and post a Ghana inventory receipt journal when applying imports.
 */
export async function upsertBranchStockWithReceipt(
  prisma: PrismaClient,
  input: {
    apply: boolean;
    branch: { id: string; country: string; name?: string };
    fragranceId: string;
    bottleSize: BottleSize;
    quantity: number;
    productLabel: string;
  }
) {
  const existing = await prisma.branchStock.findUnique({
    where: {
      branchId_fragranceId_bottleSize: {
        branchId: input.branch.id,
        fragranceId: input.fragranceId,
        bottleSize: input.bottleSize,
      },
    },
    select: { quantity: true },
  });
  const before = Number(existing?.quantity || 0);

  await prisma.branchStock.upsert({
    where: {
      branchId_fragranceId_bottleSize: {
        branchId: input.branch.id,
        fragranceId: input.fragranceId,
        bottleSize: input.bottleSize,
      },
    },
    create: {
      branchId: input.branch.id,
      fragranceId: input.fragranceId,
      bottleSize: input.bottleSize,
      quantity: input.quantity,
    },
    update: { quantity: input.quantity },
  });

  if (!input.apply) return;

  const delta = input.quantity - before;
  if (delta <= 0) return;

  try {
    const { resolveAccountingActor } = await import("../../src/lib/accounting");
    const { postInventoryMovementJournal } = await import(
      "../../src/lib/accounting-inventory-post"
    );
    const actorId = await resolveAccountingActor(prisma);
    await prisma.$transaction((tx) =>
      postInventoryMovementJournal(tx, {
        branchId: input.branch.id,
        branchCountry: input.branch.country,
        fragranceId: input.fragranceId,
        bottleSize: input.bottleSize,
        delta,
        actorUserId: actorId,
        sourceId: `import-${input.fragranceId}-${input.branch.id}-${input.bottleSize}`,
        productLabel: input.productLabel,
        reason: "Catalog import",
      })
    );
  } catch (err) {
    console.warn(
      `[import] inventory receipt skipped for ${input.productLabel} @ ${input.branch.name ?? input.branch.id}:`,
      err instanceof Error ? err.message : err
    );
  }
}
