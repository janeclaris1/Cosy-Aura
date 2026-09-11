import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { MarkNotificationsRead } from "@/components/admin/MarkNotificationsRead";
import {
  AdminCard,
  AdminEmptyState,
  AdminPageHeader,
  adminPageWrap,
} from "@/components/admin/admin-ui";

export default async function AdminNotificationsPage() {
  await requireAdminPage();

  const notifications = await prisma.adminNotification.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Inbox"
        title="Notifications"
        description={`${unread} unread · order alerts and contact enquiries`}
        actions={unread > 0 ? <MarkNotificationsRead /> : undefined}
      />

      <AdminCard padding="none" className="divide-y divide-stone-100">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-4 sm:p-5 flex gap-4 ${!n.read ? "bg-[#FFD200]/5" : ""}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[#03045e] font-medium">
                  {n.type.replace(/_/g, " ")}
                </span>
                {!n.read && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFD200]" />
                )}
              </div>
              <p className="font-medium text-espresso">{n.title}</p>
              <p className="text-sm text-mocha mt-0.5">{n.message}</p>
              <p className="text-xs text-mocha/80 mt-2">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
            {n.link && (
              <Link
                href={n.link}
                className="text-sm text-[#03045e] hover:underline shrink-0 self-center font-medium"
              >
                Open
              </Link>
            )}
          </div>
        ))}
        {notifications.length === 0 && (
          <AdminEmptyState message="No notifications yet" />
        )}
      </AdminCard>
    </div>
  );
}
