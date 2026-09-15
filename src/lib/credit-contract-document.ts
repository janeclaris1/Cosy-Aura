import type { CreditAgreement, Order, OrderItem, User } from "@prisma/client";
import { formatPrice } from "@/lib/utils";
import {
  COMPANY_LEGAL_NAME,
  buildCreditContractClauses,
  CREDIT_TERM_DAYS,
  formatCreditDate,
} from "@/lib/credit-contract";
import {
  buildReceiptTaxBreakdown,
  type GhanaPosTaxBreakdown,
} from "@/lib/pos-taxes";

export type CreditContractLineItem = {
  id: string;
  label: string;
  detail: string;
  quantity: number;
  amountGhs: number;
};

export type CreditContractDocumentProps = {
  companyLegalName: string;
  receiptNumber: string;
  agreementDate: Date;
  dueDate: Date;
  branchName: string | null;
  branchAddress: string | null;
  customerName: string;
  customerIdNumber: string;
  customerPhone: string | null;
  customerEmail: string | null;
  staffName: string;
  totalGhs: number;
  downPaymentGhs: number;
  balanceDueGhs: number;
  /** Payment method label when down payment has been recorded; empty before collection. */
  downPaymentMethodLabel: string | null;
  downPaymentReference: string | null;
  taxes: GhanaPosTaxBreakdown;
  showGhanaLevies: boolean;
  contractApprovedAt: Date | null;
  approvedByName: string | null;
  status: string;
  isDraft: boolean;
  clauses: string[];
  lineItems: CreditContractLineItem[];
};

export function downPaymentMethodLabel(method: string | null): string {
  switch (method) {
    case "CASH":
      return "Cash";
    case "MOMO":
      return "Mobile money";
    case "CARD":
      return "Card";
    case "OTHER":
      return "Other";
    default:
      return "—";
  }
}

type OrderWithContract = Order & {
  items: Array<
    OrderItem & {
      fragrance: { brand: { name: string }; model: string; reference: string };
    }
  >;
  creditAgreement: CreditAgreement & {
    contractApprovedBy?: Pick<User, "name" | "email"> | null;
  };
  posUser: Pick<User, "name" | "email"> | null;
  fulfillmentBranch: { name: string; address: string | null; city: string | null } | null;
};

export function buildCreditContractDocumentProps(
  order: OrderWithContract
): CreditContractDocumentProps {
  const credit = order.creditAgreement;
  const receiptNumber = order.receiptNumber || order.id.slice(0, 8).toUpperCase();

  return {
    companyLegalName: COMPANY_LEGAL_NAME,
    receiptNumber,
    agreementDate: order.createdAt,
    dueDate: new Date(credit.dueDate),
    branchName: order.fulfillmentBranch?.name ?? null,
    branchAddress:
      order.fulfillmentBranch?.address ||
      order.fulfillmentBranch?.city ||
      null,
    customerName: order.shippingName || "Customer",
    customerIdNumber: credit.customerIdNumber,
    customerPhone: order.shippingPhone,
    customerEmail: order.email.endsWith("@cosyaura.local") ? null : order.email,
    staffName: order.posUser?.name || order.posUser?.email || "Authorised representative",
    totalGhs: credit.totalGhs,
    downPaymentGhs: credit.downPaymentGhs,
    balanceDueGhs: credit.balanceDueGhs,
    downPaymentMethodLabel: credit.downPaymentMethod
      ? downPaymentMethodLabel(credit.downPaymentMethod)
      : null,
    downPaymentReference: credit.downPaymentReference,
    ...(() => {
      const receiptTax = buildReceiptTaxBreakdown(
        credit.totalGhs,
        order.shippingCountry
      );
      return {
        taxes: receiptTax.breakdown,
        showGhanaLevies: receiptTax.showGhanaLevies,
      };
    })(),
    contractApprovedAt: credit.contractApprovedAt,
    approvedByName:
      credit.contractApprovedBy?.name ||
      credit.contractApprovedBy?.email ||
      null,
    status: credit.status,
    isDraft: !credit.contractApprovedAt,
    clauses: buildCreditContractClauses({
      downPaymentGhs: credit.downPaymentGhs,
      balanceDueGhs: credit.balanceDueGhs,
    }),
    lineItems: order.items.map((item) => ({
      id: item.id,
      label: `${item.fragrance.brand.name} ${item.fragrance.model}`,
      detail: `${item.bottleSize}ml · ${item.fragrance.reference}`,
      quantity: item.quantity,
      amountGhs: item.price * item.quantity,
    })),
  };
}

export function formatContractMoney(amount: number): string {
  return formatPrice(amount, "GHS");
}

export function creditContractTermDays(): number {
  return CREDIT_TERM_DAYS;
}

export function formatContractDateTime(date: Date): string {
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export { formatCreditDate };
