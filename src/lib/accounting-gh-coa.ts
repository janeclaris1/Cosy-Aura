import type { GlAccountType } from "@prisma/client";

export const GH_ACCOUNTING_COUNTRY = "GH";

/** Payment source for expense entries and payroll net-pay credits. */
export type PaymentSource = "BANK" | "MOMO" | "CASH";

export const PAYMENT_SOURCE_ACCOUNT: Record<PaymentSource, string> = {
  BANK: "1010",
  MOMO: "1020",
  CASH: "1030",
};

/** Payroll posting account codes (Ghana). */
export const PAYROLL_ACCOUNTS = {
  wages: "6100",
  employerSsnit: "6110",
  payePayable: "2110",
  ssnitPayable: "2120",
} as const;

/** Sales posting account codes (Ghana). */
export const SALES_ACCOUNTS = {
  revenue: "4010",
  shipping: "4030",
  vatPayable: "2130",
  nhilPayable: "2140",
  getfundPayable: "2150",
} as const;

/** COGS posting account codes (Ghana). */
export const COGS_ACCOUNTS = {
  cogs: "5100",
  inventoryFinished: "1110",
} as const;

export type CoaSeedRow = {
  id: string;
  code: string;
  name: string;
  type: GlAccountType;
  description?: string;
};

export const GH_COA_SEED: CoaSeedRow[] = [
  { id: "glacc_gh_1010", code: "1010", name: "Cash in Bank", type: "ASSET", description: "Operating bank accounts" },
  { id: "glacc_gh_1020", code: "1020", name: "Mobile Money", type: "ASSET", description: "MoMo wallets" },
  { id: "glacc_gh_1030", code: "1030", name: "Petty Cash", type: "ASSET", description: "Cash on hand" },
  { id: "glacc_gh_1100", code: "1100", name: "Inventory - Perfume Oils", type: "ASSET" },
  { id: "glacc_gh_1110", code: "1110", name: "Inventory - Finished Goods", type: "ASSET" },
  { id: "glacc_gh_1120", code: "1120", name: "Inventory - Packaging", type: "ASSET" },
  { id: "glacc_gh_1300", code: "1300", name: "Store Equipment & Fixtures", type: "ASSET" },
  { id: "glacc_gh_1310", code: "1310", name: "POS Hardware", type: "ASSET" },
  { id: "glacc_gh_2100", code: "2100", name: "Accounts Payable", type: "LIABILITY" },
  { id: "glacc_gh_2110", code: "2110", name: "PAYE Payable", type: "LIABILITY" },
  { id: "glacc_gh_2120", code: "2120", name: "SSNIT Payable", type: "LIABILITY" },
  { id: "glacc_gh_2130", code: "2130", name: "VAT Payable", type: "LIABILITY" },
  { id: "glacc_gh_2140", code: "2140", name: "NHIL Payable", type: "LIABILITY" },
  { id: "glacc_gh_2150", code: "2150", name: "GETFund Payable", type: "LIABILITY" },
  { id: "glacc_gh_3100", code: "3100", name: "Owner's Equity", type: "EQUITY" },
  { id: "glacc_gh_3200", code: "3200", name: "Retained Earnings", type: "EQUITY" },
  { id: "glacc_gh_4010", code: "4010", name: "Retail Sales - Fragrances", type: "REVENUE" },
  { id: "glacc_gh_4020", code: "4020", name: "Retail Sales - Beauty & Cosmetics", type: "REVENUE" },
  { id: "glacc_gh_4030", code: "4030", name: "Shipping Revenue", type: "REVENUE" },
  { id: "glacc_gh_4040", code: "4040", name: "Retail Sales - Watches", type: "REVENUE" },
  { id: "glacc_gh_4050", code: "4050", name: "Retail Sales - Shirts", type: "REVENUE" },
  { id: "glacc_gh_4060", code: "4060", name: "Retail Sales - Shoes", type: "REVENUE" },
  { id: "glacc_gh_4070", code: "4070", name: "Retail Sales - Sunglasses", type: "REVENUE" },
  { id: "glacc_gh_4080", code: "4080", name: "Retail Sales - Jewelry", type: "REVENUE" },
  { id: "glacc_gh_5100", code: "5100", name: "COGS - Fragrances & Oils", type: "EXPENSE" },
  { id: "glacc_gh_5110", code: "5110", name: "COGS - Packaging", type: "EXPENSE" },
  { id: "glacc_gh_5120", code: "5120", name: "Inbound Freight & Customs", type: "EXPENSE" },
  { id: "glacc_gh_6100", code: "6100", name: "Wages & Salaries Expense", type: "EXPENSE" },
  { id: "glacc_gh_6110", code: "6110", name: "Employer SSNIT Expense", type: "EXPENSE" },
  { id: "glacc_gh_6200", code: "6200", name: "Rent Expense", type: "EXPENSE" },
  { id: "glacc_gh_6210", code: "6210", name: "Utilities Expense", type: "EXPENSE" },
  { id: "glacc_gh_6220", code: "6220", name: "Advertising & Marketing", type: "EXPENSE" },
  { id: "glacc_gh_6230", code: "6230", name: "Travel & Entertainment", type: "EXPENSE" },
  { id: "glacc_gh_6240", code: "6240", name: "Office & Shop Supplies", type: "EXPENSE" },
  { id: "glacc_gh_6250", code: "6250", name: "Merchant Processing Fees", type: "EXPENSE" },
  { id: "glacc_gh_6260", code: "6260", name: "Software & Subscriptions", type: "EXPENSE" },
  { id: "glacc_gh_6270", code: "6270", name: "Depreciation Expense", type: "EXPENSE" },
  { id: "glacc_gh_6290", code: "6290", name: "Other Operating Expenses", type: "EXPENSE" },
];

/** Expense accounts available for manual entry (6200–6299). */
export const GH_EXPENSE_ACCOUNT_CODES = GH_COA_SEED.filter(
  (a) => a.type === "EXPENSE" && a.code >= "6200"
).map((a) => a.code);
