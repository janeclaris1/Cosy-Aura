import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { fetchAccountOrders } from "@/lib/account-orders";
import {
  AccountOrderHistory,
  buildAccountOrderRows,
} from "@/components/account/AccountOrderHistory";

export default async function AccountOrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    redirect("/account/login");
  }

  const orders = await fetchAccountOrders(session.user.id, session.user.email);
  const orderRows = buildAccountOrderRows(orders, session.user.email);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 text-sm font-roboto text-wf-gray hover:text-[#03045e] mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
        Back to account
      </Link>

      <AccountOrderHistory orders={orderRows} customerEmail={session.user.email} />
    </div>
  );
}
