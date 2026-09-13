import { AdminButton, AdminCard, AdminTabLinks, adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

type Pill = { id: string; label: string; href: string };

export function OrdersFilters({
  q,
  status,
  channel,
  channelPills,
  statusPills,
  activeChannel,
  activeStatus,
}: {
  q?: string;
  status?: string;
  channel?: string;
  channelPills: Pill[];
  statusPills: Pill[];
  activeChannel: string;
  activeStatus: string;
}) {
  return (
    <AdminCard className="space-y-5">
      <form action="/admin/orders" method="get" className="flex flex-col sm:flex-row gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        {channel && channel !== "ALL" && (
          <input type="hidden" name="channel" value={channel} />
        )}
        <input
          name="q"
          defaultValue={q || ""}
          placeholder="Search email, receipt, name, phone…"
          className={cn(adminInputClass, "flex-1 rounded-xl")}
        />
        <AdminButton type="submit" variant="secondary" className="shrink-0">
          Search
        </AdminButton>
      </form>
      <div className="space-y-4 pt-1 border-t border-stone-100">
        <div className="min-w-0">
          <p className={adminLabelClass}>Channel</p>
          <AdminTabLinks
            items={channelPills}
            activeId={activeChannel}
            size="sm"
            nowrap
          />
        </div>
        <div className="min-w-0">
          <p className={adminLabelClass}>Status</p>
          <AdminTabLinks
            items={statusPills}
            activeId={activeStatus}
            size="sm"
            nowrap
          />
        </div>
      </div>
    </AdminCard>
  );
}
