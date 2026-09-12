import "@/components/admin/payslip-print.css";

export default function PayslipPrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="payslip-print-root">{children}</div>;
}
