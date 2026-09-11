import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { EnquiryActions } from "@/components/admin/EnquiryActions";
import {
  AdminCard,
  AdminEmptyState,
  AdminPageHeader,
  adminPageWrap,
} from "@/components/admin/admin-ui";

export default async function AdminEnquiriesPage() {
  await requireAdminPage();

  const enquiries = await prisma.contactEnquiry.findMany({
    orderBy: { createdAt: "desc" },
  });

  const unread = enquiries.filter((e) => !e.read).length;

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Inbox"
        title="Enquiries"
        description={`${unread} unread · messages from the contact form`}
      />

      <div className="space-y-4">
        {enquiries.map((enquiry) => (
          <AdminCard
            key={enquiry.id}
            className={!enquiry.read ? "border-l-4 border-l-[#FFD200]" : undefined}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
              <div>
                <h2 className="font-medium text-espresso">{enquiry.subject}</h2>
                <p className="text-sm text-mocha mt-0.5">
                  {enquiry.name} ·{" "}
                  <a
                    href={`mailto:${enquiry.email}`}
                    className="text-[#03045e] hover:underline font-medium"
                  >
                    {enquiry.email}
                  </a>
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-mocha">
                  {new Date(enquiry.createdAt).toLocaleString()}
                </span>
                <EnquiryActions id={enquiry.id} read={enquiry.read} />
              </div>
            </div>
            <p className="text-sm text-mocha leading-relaxed whitespace-pre-wrap">
              {enquiry.message}
            </p>
          </AdminCard>
        ))}
        {enquiries.length === 0 && (
          <AdminCard>
            <AdminEmptyState message="No enquiries yet" />
          </AdminCard>
        )}
      </div>
    </div>
  );
}
