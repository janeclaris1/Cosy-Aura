import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminSubscribersPage() {
  await requireAdminPage();

  const subscribers = await prisma.newsletterSubscriber.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="font-playfair text-3xl">Newsletter</h1>
          <p className="text-sm text-wf-gray mt-1">
            {subscribers.length} subscriber{subscribers.length === 1 ? "" : "s"}
          </p>
        </div>
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
          className="btn-outline text-sm py-2 px-4"
        >
          Export CSV
        </a>
      </div>

      <div className="border border-wf-border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-wf-light">
            <tr>
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-left p-3 font-medium">Phone / WhatsApp</th>
              <th className="text-left p-3 font-medium">Subscribed</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((s) => (
              <tr key={s.id} className="border-t border-wf-border">
                <td className="p-3">{s.email}</td>
                <td className="p-3">{s.phone || "—"}</td>
                <td className="p-3 text-wf-gray">
                  {new Date(s.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {subscribers.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-wf-gray">
                  No subscribers yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
