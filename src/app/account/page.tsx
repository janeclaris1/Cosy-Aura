import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { creditBalanceRemaining } from "@/lib/credit-agreement";
import { formatCreditDate } from "@/lib/credit-contract";
import { formatPrice } from "@/lib/utils";
import { AccountOrderHistoryButton } from "@/components/account/AccountOrderHistoryButton";
import { countAccountOrders } from "@/lib/account-orders";
import { SignOutButton } from "@/components/account/SignOutButton";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  const profile = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { phone: true, memberDiscount: true },
      })
    : null;

  const creditAgreements =
    session?.user?.id
      ? await prisma.creditAgreement.findMany({
          where: {
            OR: [
              { userId: session.user.id },
              ...(session.user.email
                ? [{ order: { email: session.user.email } }]
                : []),
            ],
          },
          include: {
            order: {
              select: {
                receiptNumber: true,
                createdAt: true,
                shippingName: true,
              },
            },
          },
          orderBy: { dueDate: "asc" },
        })
      : [];

  const orderCount =
    session?.user?.id && session.user.email
      ? await countAccountOrders(session.user.id, session.user.email)
      : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-playfair text-3xl mb-2">My Account</h1>
      <p className="text-wf-gray mb-8">
        Manage your profile, orders, and saved fragrances.
      </p>

      {session?.user ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="border border-wf-border p-6 bg-white">
              <h2 className="font-semibold mb-3">Profile</h2>
              <p className="text-sm text-wf-gray mb-1">Name</p>
              <p className="mb-3">{session.user.name || "Not set"}</p>
              <p className="text-sm text-wf-gray mb-1">Email</p>
              <p className="mb-3">{session.user.email}</p>
              <p className="text-sm text-wf-gray mb-1">Phone / WhatsApp</p>
              <p>{profile?.phone || "Not set"}</p>
              {(profile?.memberDiscount ?? session.user.memberDiscount) ? (
                <p className="mt-4 text-sm text-gold">
                  Member benefit: permanent 5% discount on every order while
                  signed in.
                </p>
              ) : null}
              {isAdmin && (
                <p className="mt-4 text-xs uppercase tracking-wider text-gold">
                  Administrator
                </p>
              )}
            </section>

            <section className="border border-wf-border p-6 bg-white">
              <h2 className="font-semibold mb-3">Quick Actions</h2>
              <div className="space-y-3">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="btn-gold w-full text-center block text-sm"
                  >
                    Open Admin Panel
                  </Link>
                )}
                <Link
                  href="/track"
                  className="btn-outline w-full text-center block text-sm"
                >
                  Track an order
                </Link>
                <Link
                  href="/wishlist"
                  className="btn-outline w-full text-center block text-sm"
                >
                  View Wishlist
                </Link>
                <Link
                  href="/fragrances"
                  className="btn-outline w-full text-center block text-sm"
                >
                  Continue Shopping
                </Link>
                <SignOutButton />
              </div>
            </section>
          </div>

          {creditAgreements.length > 0 && (
            <section className="border border-wf-border p-6 bg-white">
              <h2 className="font-semibold mb-2">Credit agreements</h2>
              <p className="text-sm text-wf-gray mb-4">
                In-store credit: 70% down payment, balance due within 30 days. Goods are
                released when paid in full.
              </p>
              <ul className="divide-y divide-wf-border">
                {creditAgreements.map((agreement) => {
                  const remaining = creditBalanceRemaining(agreement);
                  return (
                    <li key={agreement.id} className="py-4 space-y-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            {agreement.order.receiptNumber ||
                              agreement.orderId.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="text-sm text-wf-gray">
                            {new Date(agreement.order.createdAt).toLocaleDateString()}
                            {agreement.order.shippingName
                              ? ` · ${agreement.order.shippingName}`
                              : ""}
                          </p>
                        </div>
                        <span
                          className={
                            agreement.status === "ACTIVE"
                              ? "text-amber-700 text-sm font-medium"
                              : agreement.status === "PAID"
                                ? "text-emerald-700 text-sm font-medium"
                                : "text-red-700 text-sm font-medium"
                          }
                        >
                          {agreement.status}
                        </span>
                      </div>
                      <p className="text-sm">
                        Total {formatPrice(agreement.totalGhs, "GHS")} · Down{" "}
                        {formatPrice(agreement.downPaymentGhs, "GHS")} · Balance{" "}
                        {formatPrice(remaining, "GHS")}
                      </p>
                      {agreement.status === "ACTIVE" && remaining > 0 && (
                        <p className="text-sm text-wf-gray">
                          Due by {formatCreditDate(new Date(agreement.dueDate))}. Pay
                          in store or contact support@cosyaura.com.
                        </p>
                      )}
                      {agreement.status === "DEFAULTED" &&
                        agreement.penaltyGhs != null &&
                        agreement.refundGhs != null && (
                          <p className="text-sm text-wf-gray">
                            Agreement defaulted. Penalty{" "}
                            {formatPrice(agreement.penaltyGhs, "GHS")} · Refund issued{" "}
                            {formatPrice(agreement.refundGhs, "GHS")}.
                          </p>
                        )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <AccountOrderHistoryButton orderCount={orderCount} />
        </div>
      ) : (
        <div className="border border-wf-border p-6 bg-white max-w-lg">
          <p className="text-wf-gray mb-6">
            Sign in or create an account to view your profile and order history.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/account/login" className="btn-gold">
              Sign in
            </Link>
            <Link href="/account/register" className="btn-outline">
              Create account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
