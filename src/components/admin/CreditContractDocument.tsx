import { PosTaxSummary } from "@/components/admin/PosTaxSummary";
import {
  type CreditContractDocumentProps,
  formatContractDateTime,
  formatContractMoney,
  formatCreditDate,
  creditContractTermDays,
} from "@/lib/credit-contract-document";

export type { CreditContractDocumentProps };

export function CreditContractDocument({ doc }: { doc: CreditContractDocumentProps }) {
  return (
    <article className="credit-contract-doc border border-stone-200/80 rounded-2xl p-8 sm:p-10 print:border-0 print:rounded-none print:p-0">
      <header className="credit-contract-doc__header">
        <p className="credit-contract-doc__brand">{doc.companyLegalName}</p>
        <h1 className="credit-contract-doc__title">Credit purchase agreement</h1>
        <div className="credit-contract-doc__meta">
          <p>
            Agreement ref.{" "}
            <span className="font-mono font-medium text-espresso">{doc.receiptNumber}</span>
          </p>
          <p>
            Date of agreement: {formatContractDateTime(doc.agreementDate)} · Balance due by{" "}
            {formatCreditDate(doc.dueDate)} ({creditContractTermDays()} days)
          </p>
          {(doc.branchName || doc.branchAddress) && (
            <p>
              Store: {[doc.branchName, doc.branchAddress].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </header>

      <div className="credit-contract-doc__grid">
        <section>
          <h2 className="credit-contract-doc__section-title">Customer</h2>
          <p className="font-medium">{doc.customerName}</p>
          <p className="text-sm text-mocha">
            ID no. <span className="font-mono text-espresso">{doc.customerIdNumber}</span>
          </p>
          {doc.customerPhone && <p className="text-sm text-mocha">{doc.customerPhone}</p>}
          {doc.customerEmail && <p className="text-sm text-mocha">{doc.customerEmail}</p>}
        </section>
        <section>
          <h2 className="credit-contract-doc__section-title">{doc.companyLegalName}</h2>
          <p className="font-medium">{doc.staffName}</p>
          <p className="text-sm text-mocha">Authorised representative</p>
        </section>
      </div>

      <section className="mb-6">
        <h2 className="credit-contract-doc__section-title">Goods covered (held until paid in full)</h2>
        <table className="credit-contract-doc__table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.lineItems.map((line) => (
              <tr key={line.id}>
                <td>
                  <span className="font-medium">{line.label}</span>
                  <br />
                  <span className="text-mocha text-xs">{line.detail}</span>
                </td>
                <td>{line.quantity}</td>
                <td>{formatContractMoney(line.amountGhs)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="credit-contract-doc__summary">
          <div className="credit-contract-doc__summary-row">
            <span>Purchase total</span>
            <span>{formatContractMoney(doc.totalGhs)}</span>
          </div>
          <PosTaxSummary
            taxes={doc.taxes}
            formatAmount={formatContractMoney}
            showTaxable
            showTotal={false}
            className="py-2 border-y border-stone-200/80 text-sm"
          />
          <div className="credit-contract-doc__summary-row">
            <span>
              Down payment (70%)
              {doc.downPaymentMethodLabel ? ` · ${doc.downPaymentMethodLabel}` : ""}
            </span>
            <span>{formatContractMoney(doc.downPaymentGhs)}</span>
          </div>
          {doc.downPaymentReference && (
            <div className="credit-contract-doc__summary-row text-mocha text-xs">
              <span>Down payment ref.</span>
              <span className="font-mono">{doc.downPaymentReference}</span>
            </div>
          )}
          <div className="credit-contract-doc__summary-row credit-contract-doc__summary-row--total">
            <span>Balance due (30%)</span>
            <span>{formatContractMoney(doc.balanceDueGhs)}</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="credit-contract-doc__section-title">Terms &amp; conditions</h2>
        <ol className="credit-contract-doc__clauses">
          {doc.clauses.map((clause) => (
            <li key={clause}>{clause}</li>
          ))}
        </ol>
      </section>

      <section className="credit-contract-doc__signatures">
        <div>
          <p className="text-mocha mb-1">Customer signature</p>
          <div className="credit-contract-doc__sign-line" />
          <p className="font-medium">{doc.customerName}</p>
          <p className="text-mocha text-xs mt-1">Date: ___________________</p>
        </div>
        <div>
          <p className="text-mocha mb-1">{doc.companyLegalName} representative</p>
          <div className="credit-contract-doc__sign-line" />
          <p className="font-medium">{doc.staffName}</p>
          <p className="text-mocha text-xs mt-1">Date: ___________________</p>
        </div>
      </section>

      {doc.isDraft && (
        <p className="credit-contract-doc__draft print:hidden">
          Draft — approve in Legal before printing for customer signature
        </p>
      )}

      <footer className="credit-contract-doc__footer">
        <p>
          {doc.contractApprovedAt ? (
            <>
              Approved {formatContractDateTime(doc.contractApprovedAt)}
              {doc.approvedByName ? ` by ${doc.approvedByName}` : ""}
            </>
          ) : (
            <>Pending Legal approval</>
          )}{" "}
          · Status: {doc.status}
        </p>
        <p className="mt-1">support@cosyaura.com · cosyaura.com</p>
      </footer>
    </article>
  );
}
