import { requireAdminPage } from "@/lib/admin";
import { checkoutAbandonmentWhere } from "@/lib/checkout-abandonment-scope";
import { prisma } from "@/lib/prisma";
import { AbandonedCheckoutsTable } from "@/components/admin/AbandonedCheckoutsTable";
import { AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";

export default async function AdminAbandonedCheckoutsPage() {
  const ctx = await requireAdminPage("orders.read");
  const where = await checkoutAbandonmentWhere(ctx);

  const rows = await prisma.checkoutAbandonment.findMany({
    where,
    orderBy: { lastSeenAt: "desc" },
    take: 100,
    include: {
      order: { select: { id: true, status: true } },
    },
  });

  const atPayment = rows.filter((row) => row.order?.status === "PENDING").length;

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Sales"
        title="Abandoned checkouts"
        description={`${rows.length} open · ${atPayment} at payment · recovery emails send automatically after 1 hour (cron) or use Send recovery`}
      />

      <AbandonedCheckoutsTable rows={rows} />
    </div>
  );
}
