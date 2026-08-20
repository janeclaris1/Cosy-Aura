import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { EnquiryActions } from "@/components/admin/EnquiryActions";

export default async function AdminEnquiriesPage() {
  await requireAdminPage();

  const enquiries = await prisma.contactEnquiry.findMany({
    orderBy: { createdAt: "desc" },
  });

  const unread = enquiries.filter((e) => !e.read).length;

  return (
    <div>
      <h1 className="font-playfair text-3xl mb-2">Enquiries</h1>
      <p className="text-sm text-wf-gray mb-8">
        {unread} unread · messages from the contact form
      </p>

      <div className="space-y-4">
        {enquiries.map((enquiry) => (
          <article
            key={enquiry.id}
            className={`bg-white border border-wf-border rounded-lg p-5 ${
              !enquiry.read ? "border-l-4 border-l-gold" : ""
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
              <div>
                <h2 className="font-medium text-wf-black">{enquiry.subject}</h2>
                <p className="text-sm text-wf-gray mt-0.5">
                  {enquiry.name} ·{" "}
                  <a
                    href={`mailto:${enquiry.email}`}
                    className="text-gold hover:underline"
                  >
                    {enquiry.email}
                  </a>
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-wf-gray">
                  {new Date(enquiry.createdAt).toLocaleString()}
                </span>
                <EnquiryActions id={enquiry.id} read={enquiry.read} />
              </div>
            </div>
            <p className="text-sm text-wf-gray leading-relaxed whitespace-pre-wrap">
              {enquiry.message}
            </p>
          </article>
        ))}
        {enquiries.length === 0 && (
          <p className="text-center text-wf-gray py-12 border border-wf-border rounded-lg bg-white">
            No enquiries yet
          </p>
        )}
      </div>
    </div>
  );
}
