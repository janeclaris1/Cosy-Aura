import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { MarkNotificationsRead } from "@/components/admin/MarkNotificationsRead";

export default async function AdminNotificationsPage() {
  await requireAdminPage();

  const notifications = await prisma.adminNotification.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="font-playfair text-3xl">Notifications</h1>
          <p className="text-sm text-wf-gray mt-1">
            {unread} unread · order alerts and contact enquiries
          </p>
        </div>
        {unread > 0 && <MarkNotificationsRead />}
      </div>

      <div className="bg-white border border-wf-border rounded-lg divide-y divide-wf-border">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-4 flex gap-4 ${!n.read ? "bg-gold/5" : ""}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider text-gold">
                  {n.type.replace(/_/g, " ")}
                </span>
                {!n.read && (
                  <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                )}
              </div>
              <p className="font-medium text-wf-black">{n.title}</p>
              <p className="text-sm text-wf-gray mt-0.5">{n.message}</p>
              <p className="text-xs text-wf-gray mt-2">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
            {n.link && (
              <Link
                href={n.link}
                className="text-sm text-gold hover:underline shrink-0 self-center"
              >
                Open
              </Link>
            )}
          </div>
        ))}
        {notifications.length === 0 && (
          <p className="p-8 text-center text-wf-gray">No notifications yet</p>
        )}
      </div>
    </div>
  );
}
