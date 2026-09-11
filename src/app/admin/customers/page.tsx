import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import {
  AdminEmptyState,
  AdminLink,
  AdminPageHeader,
  AdminSectionTitle,
  AdminTableWrap,
  adminPageWrap,
  adminTdClass,
  adminThClass,
  adminTheadClass,
  adminTrClass,
  adminTableClass,
} from "@/components/admin/admin-ui";

export default async function AdminCustomersPage() {
  await requireAdminPage();

  const [users, guestOrders] = await Promise.all([
    prisma.user.findMany({
      where: { role: "USER" },
      include: {
        _count: { select: { orders: true, wishlist: true } },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { total: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.groupBy({
      by: ["email"],
      where: { userId: null },
      _count: true,
      _sum: { total: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
      take: 50,
    }),
  ]);

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Sales"
        title="Customers"
        description="Registered accounts and recent guest checkout emails."
      />

      <section>
        <AdminSectionTitle title="Accounts" />
        <AdminTableWrap>
          <table className={adminTableClass}>
            <thead className={adminTheadClass}>
              <tr>
                <th className={adminThClass}>Email</th>
                <th className={adminThClass}>Name</th>
                <th className={adminThClass}>Phone</th>
                <th className={adminThClass}>Orders</th>
                <th className={adminThClass}>Wishlist</th>
                <th className={adminThClass}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={adminTrClass}>
                  <td className={adminTdClass}>{user.email}</td>
                  <td className={adminTdClass}>{user.name || "—"}</td>
                  <td className={adminTdClass}>{user.phone || "—"}</td>
                  <td className={adminTdClass}>{user._count.orders}</td>
                  <td className={adminTdClass}>{user._count.wishlist}</td>
                  <td className={`${adminTdClass} text-mocha`}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <AdminEmptyState message="No customer accounts yet" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </AdminTableWrap>
      </section>

      <section>
        <AdminSectionTitle title="Guest checkouts" />
        <AdminTableWrap>
          <table className={adminTableClass}>
            <thead className={adminTheadClass}>
              <tr>
                <th className={adminThClass}>Email</th>
                <th className={adminThClass}>Orders</th>
                <th className={adminThClass}>Total spent</th>
                <th className={adminThClass}>Last order</th>
              </tr>
            </thead>
            <tbody>
              {guestOrders.map((row) => (
                <tr key={row.email} className={adminTrClass}>
                  <td className={adminTdClass}>
                    <AdminLink href={`/admin/orders?q=${encodeURIComponent(row.email)}`}>
                      {row.email}
                    </AdminLink>
                  </td>
                  <td className={adminTdClass}>{row._count}</td>
                  <td className={adminTdClass}>{formatPrice(row._sum.total || 0)}</td>
                  <td className={`${adminTdClass} text-mocha`}>
                    {row._max.createdAt
                      ? new Date(row._max.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
              {guestOrders.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <AdminEmptyState message="No guest orders yet" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </AdminTableWrap>
      </section>
    </div>
  );
}
