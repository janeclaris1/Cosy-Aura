import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAdminPage, orderBranchWhere } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminButton, AdminLink, AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";
import { CreditContractDocument } from "@/components/admin/CreditContractDocument";
import { CreditContractActions } from "@/components/admin/CreditContractActions";
import { CreditContractDownPaymentForm } from "@/components/admin/CreditContractDownPaymentForm";
import { buildCreditContractDocumentProps } from "@/lib/credit-contract-document";
import { creditReceiptReady } from "@/lib/credit-agreement";

export default async function LegalCreditContractPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await requireAdminPage("legal.read");

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          fragrance: { include: { brand: true } },
        },
      },
      fulfillmentBranch: { select: { name: true, address: true, city: true } },
      posUser: { select: { name: true, email: true } },
      creditAgreement: {
        include: {
          contractApprovedBy: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!order || order.channel !== "POS" || !order.creditAgreement) notFound();
  const creditAgreement = order.creditAgreement;

  const scope = orderBranchWhere(ctx);
  if (scope) {
    const allowed = await prisma.order.findFirst({
      where: { id: order.id, ...(scope as object) },
      select: { id: true },
    });
    if (!allowed) notFound();
  }

  const voided = order.status === "REFUNDED" || order.status === "CANCELLED";
  const approved = Boolean(creditAgreement.contractApprovedAt);
  const receiptReady = creditReceiptReady(creditAgreement);
  const doc = buildCreditContractDocumentProps({ ...order, creditAgreement });

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Legal"
        title="Credit purchase agreement"
        description={
          receiptReady
            ? "Contract signed and down payment recorded — print the receipt at POS."
            : approved
              ? "Print the contract for signature, then record the 70% down payment."
              : "Generate the contract from Legal before the customer signs and pays."
        }
        actions={
          <CreditContractActions
            orderId={order.id}
            approved={approved}
            voided={voided}
          />
        }
      />

      {approved && !receiptReady && !voided && (
        <div className="print:hidden mb-6">
          <CreditContractDownPaymentForm
            orderId={order.id}
            downPaymentGhs={creditAgreement.downPaymentGhs}
          />
        </div>
      )}

      {receiptReady && !voided && (
        <div className="print:hidden mb-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm px-4 py-3 rounded-xl">
          Down payment recorded —{" "}
          <AdminLink href={`/admin/pos/receipt/${order.id}`}>
            print the POS receipt
          </AdminLink>
          .
        </div>
      )}

      <div className="credit-contract-print-root credit-contract-shell">
        <div className="print:hidden flex flex-wrap items-center gap-3 mb-6">
          <AdminButton
            href="/admin/legal/credit-contracts"
            variant="secondary"
            className="!rounded-xl !px-3.5 !py-2 text-xs shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            All contracts
          </AdminButton>
          {receiptReady ? (
            <AdminLink href={`/admin/pos/receipt/${order.id}`}>POS receipt</AdminLink>
          ) : null}
          <AdminLink href={`/admin/orders/${order.id}`}>Order detail</AdminLink>
        </div>

        {voided && (
          <div className="print:hidden mb-4 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-xl">
            This agreement relates to a voided sale ({order.status}).
          </div>
        )}

        {!approved && !voided && (
          <div className="print:hidden mb-4 bg-amber-50 border border-amber-200 text-amber-950 text-sm px-4 py-3 rounded-xl">
            Step 1: Use <strong>Generate &amp; print contract</strong> when customer details
            and ID number are correct.
          </div>
        )}

        <CreditContractDocument doc={doc} />
      </div>
    </div>
  );
}
