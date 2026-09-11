import Link from "next/link";
import { AdminButton, AdminCard, adminInputClass } from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

type Pill = { id: string; label: string; href: string };

function FilterGroup({ label, items, activeId }: { label: string; items: Pill[]; activeId: string }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-mocha font-medium">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              activeId === item.id
                ? "bg-[#03045e] text-white shadow-sm"
                : "bg-[#fafafa] text-mocha ring-1 ring-stone-200/80 hover:bg-white hover:ring-[#03045e]/20"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

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
      <div className="grid sm:grid-cols-2 gap-5 pt-1 border-t border-stone-100">
        <FilterGroup label="Channel" items={channelPills} activeId={activeChannel} />
        <FilterGroup label="Status" items={statusPills} activeId={activeStatus} />
      </div>
    </AdminCard>
  );
}
