import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

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
    <div>
      <h1 className="font-playfair text-3xl mb-2">Customers</h1>
      <p className="text-sm text-wf-gray mb-8">
        Registered accounts and recent guest checkout emails.
      </p>

      <h2 className="font-playfair text-xl mb-4">Accounts</h2>
      <div className="border border-wf-border rounded-lg overflow-hidden bg-white mb-10">
        <table className="w-full text-sm">
          <thead className="bg-wf-light">
            <tr>
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Phone</th>
              <th className="text-left p-3 font-medium">Orders</th>
              <th className="text-left p-3 font-medium">Wishlist</th>
              <th className="text-left p-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-wf-border">
                <td className="p-3">{user.email}</td>
                <td className="p-3">{user.name || "-"}</td>
                <td className="p-3">{user.phone || "-"}</td>
                <td className="p-3">{user._count.orders}</td>
                <td className="p-3">{user._count.wishlist}</td>
                <td className="p-3 text-wf-gray">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-wf-gray">
                  No customer accounts yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="font-playfair text-xl mb-4">Guest checkouts</h2>
      <div className="border border-wf-border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-wf-light">
            <tr>
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-left p-3 font-medium">Orders</th>
              <th className="text-left p-3 font-medium">Total spent</th>
              <th className="text-left p-3 font-medium">Last order</th>
            </tr>
          </thead>
          <tbody>
            {guestOrders.map((row) => (
              <tr key={row.email} className="border-t border-wf-border">
                <td className="p-3">
                  <Link
                    href={`/admin/orders?q=${encodeURIComponent(row.email)}`}
                    className="text-gold hover:underline"
                  >
                    {row.email}
                  </Link>
                </td>
                <td className="p-3">{row._count}</td>
                <td className="p-3">{formatPrice(row._sum.total || 0)}</td>
                <td className="p-3 text-wf-gray">
                  {row._max.createdAt
                    ? new Date(row._max.createdAt).toLocaleDateString()
                    : "-"}
                </td>
              </tr>
            ))}
            {guestOrders.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-wf-gray">
                  No guest orders yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
