import "@/components/admin/hr-document-print.css";

export default function HrDocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="hr-doc-print-root">{children}</div>;
}
