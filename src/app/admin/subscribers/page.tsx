import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { mailchimpConfigured } from "@/lib/mailchimp";
import { SyncMailchimpButton } from "@/components/admin/SyncMailchimpButton";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminTableWrap,
  adminPageWrap,
  adminTdClass,
  adminThClass,
  adminTheadClass,
  adminTrClass,
  adminTableClass,
} from "@/components/admin/admin-ui";

export default async function AdminSubscribersPage() {
  await requireAdminPage();

  const subscribers = await prisma.newsletterSubscriber.findMany({
    orderBy: { createdAt: "desc" },
  });
  const configured = mailchimpConfigured();

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Marketing"
        title="Newsletter"
        description={`${subscribers.length} subscriber${subscribers.length === 1 ? "" : "s"}${configured ? " · Mailchimp connected" : ""}`}
        actions={
          <>
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(
                ["email,phone,subscribed_at"]
                  .concat(
                    subscribers.map(
                      (s) =>
                        `${s.email},${s.phone || ""},${s.createdAt.toISOString()}`
                    )
                  )
                  .join("\n")
              )}`}
              download="newsletter-subscribers.csv"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border border-stone-200/90 text-[#03045e] hover:bg-[#fafafa] transition-colors"
            >
              Export CSV
            </a>
            <SyncMailchimpButton configured={configured} count={subscribers.length} />
          </>
        }
      />

      <AdminTableWrap>
        <table className={adminTableClass}>
          <thead className={adminTheadClass}>
            <tr>
              <th className={adminThClass}>Email</th>
              <th className={adminThClass}>Phone / WhatsApp</th>
              <th className={adminThClass}>Subscribed</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((s) => (
              <tr key={s.id} className={adminTrClass}>
                <td className={adminTdClass}>{s.email}</td>
                <td className={adminTdClass}>{s.phone || "—"}</td>
                <td className={`${adminTdClass} text-mocha`}>
                  {new Date(s.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {subscribers.length === 0 && (
              <tr>
                <td colSpan={3}>
                  <AdminEmptyState message="No subscribers yet" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </AdminTableWrap>
    </div>
  );
}
