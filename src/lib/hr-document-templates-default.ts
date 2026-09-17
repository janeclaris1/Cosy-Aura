import type {
  EmploymentType,
  HrDocumentCategory,
  HrDocumentTemplateKind,
  StaffRole,
} from "@prisma/client";

export type DefaultHrTemplate = {
  slug: string;
  name: string;
  category: HrDocumentCategory;
  kind: HrDocumentTemplateKind;
  country?: string;
  staffRole?: StaffRole | null;
  employmentType?: EmploymentType | null;
  sortOrder: number;
  body: string;
  checklistItems?: Array<{ id: string; label: string; required?: boolean }>;
};

const OFFER_BODY = `Dear {{employee.name}},

We are pleased to offer you the position of {{employee.jobTitle}} at {{company.name}}, reporting to the {{employee.department}} function. Your proposed start date is {{employee.hireDate}}.

Compensation: Basic salary {{employee.basicSalary}} per month, plus allowances of {{employee.allowances}} (gross {{employee.grossMonthly}}), subject to statutory deductions and payroll approval.

Place of work: {{employee.branches}}.

This offer is subject to satisfactory verification of your Ghana Card, TIN, and SSNIT details, and signing of the employment contract.

Please confirm acceptance within seven (7) working days.

Yours sincerely,
Human Resources
{{company.name}}`;

const CONTRACT_INTRO = `This employment agreement is made on {{document.date}} between {{company.name}} (the Employer) and {{employee.name}} (the Employee).`;

function contractBody(roleClause: string): string {
  return `${CONTRACT_INTRO}

1. Position. The Employee is engaged as {{employee.jobTitle}} ({{employee.role}}) on a {{employee.employmentType}} basis, effective {{employee.hireDate}}.

2. Duties. ${roleClause}

3. Remuneration. Basic salary {{employee.basicSalary}} plus allowances {{employee.allowances}} (gross {{employee.grossMonthly}}), paid monthly via approved payroll.

4. Place of work. {{employee.branches}} and other locations as reasonably required.

5. Compliance. The Employee shall maintain valid Ghana Card, TIN, and SSNIT registration as applicable.

6. Confidentiality. The Employee shall not disclose customer, pricing, or operational information without written consent.

7. Termination. Either party may terminate in accordance with Ghana labour practice and internal HR policy, with written notice.

Signed for the Employer: _________________________ Date: __________

Signed by the Employee: _________________________ Date: __________`;
}

const ROLE_CLAUSES: Record<string, string> = {
  default:
    "The Employee shall perform duties assigned by management honestly, diligently, and in line with company policies.",
  FULFILMENT:
    "The Employee shall receive, pick, pack, and dispatch orders; maintain accurate branch stock; and support POS and customer collections.",
  CONTENT:
    "The Employee shall prepare product copy, images coordination, and journal content in line with brand guidelines.",
  SUPPORT:
    "The Employee shall respond to customer enquiries, track orders, and escalate issues to management when required.",
  BRANCH_MANAGER:
    "The Employee shall supervise branch operations, staff attendance, cash/POS controls, and local inventory accuracy.",
  COUNTRY_MANAGER:
    "The Employee shall oversee multi-branch performance, compliance, and country-level operational targets.",
  HR: "The Employee shall maintain employee records, leave, and payroll inputs in accordance with Ghana regulations.",
  ACCOUNTANT:
    "The Employee shall maintain books, payroll journals, tax reporting support, and management accounts.",
};

const DISCIPLINARY_BODY = `Written Warning

Date: {{document.date}}

Employee: {{employee.name}} ({{employee.number}})
Role: {{employee.jobTitle}} · {{employee.branches}}

This letter records a formal warning regarding conduct/performance that does not meet {{company.name}} standards. Specific incident(s) and expected improvement are documented on the attached HR file.

The Employee is required to meet agreed standards immediately. Further breaches may lead to final written warning or termination.

Employee acknowledgement: _________________________ Date: __________

Manager / HR: _________________________ Date: __________`;

const FINAL_WARNING_BODY = `Final Written Warning

Date: {{document.date}}

Employee: {{employee.name}} ({{employee.number}})

Following prior warnings, this is a final written warning. Failure to sustain required conduct and performance may result in termination of employment without further notice, subject to applicable law and internal process.

Review period: 30 calendar days from {{document.date}}.

Employee acknowledgement: _________________________ Date: __________

HR / Management: _________________________ Date: __________`;

const ONBOARDING_ITEMS = [
  { id: "offer-signed", label: "Offer letter signed and filed", required: true },
  { id: "contract-signed", label: "Employment contract signed", required: true },
  { id: "ghana-card", label: "Ghana Card copy verified", required: true },
  { id: "tin-ssnit", label: "TIN & SSNIT numbers captured", required: true },
  { id: "bank-momo", label: "Bank / MoMo payment details confirmed", required: true },
  { id: "staff-account", label: "Admin staff account created & role assigned", required: true },
  { id: "branch-assignment", label: "Branch assignment completed", required: true },
  { id: "attendance-enroll", label: "Attendance device enrollment (if applicable)", required: false },
  { id: "uniform-kit", label: "Uniform / ID issued", required: false },
  { id: "policy-briefing", label: "POS, stock, and customer policy briefing", required: true },
];

const OFFBOARDING_ITEMS = [
  { id: "resignation-letter", label: "Resignation / termination letter on file", required: true },
  { id: "final-payroll", label: "Final payroll & leave balance calculated", required: true },
  { id: "asset-return", label: "Company assets returned (keys, devices, uniform)", required: true },
  { id: "access-revoked", label: "Admin access deactivated", required: true },
  { id: "attendance-removed", label: "Attendance enrollment removed", required: false },
  { id: "exit-interview", label: "Exit interview completed", required: false },
  { id: "reference-note", label: "Reference / service letter issued (if applicable)", required: false },
];

const STAFF_ROLES: StaffRole[] = [
  "FULFILMENT",
  "CONTENT",
  "SUPPORT",
  "BRANCH_MANAGER",
  "COUNTRY_MANAGER",
  "HR",
  "ACCOUNTANT",
];

export const DEFAULT_HR_TEMPLATES: DefaultHrTemplate[] = [
  {
    slug: "offer-letter-standard",
    name: "Offer letter (standard)",
    category: "OFFER_LETTER",
    kind: "LETTER",
    sortOrder: 0,
    body: OFFER_BODY,
  },
  {
    slug: "employment-contract-standard",
    name: "Employment contract (standard)",
    category: "EMPLOYMENT_CONTRACT",
    kind: "LETTER",
    sortOrder: 0,
    body: contractBody(ROLE_CLAUSES.default),
  },
  ...STAFF_ROLES.map((role, index) => ({
    slug: `employment-contract-${role.toLowerCase().replace(/_/g, "-")}`,
    name: `Employment contract (${role.replace(/_/g, " ").toLowerCase()})`,
    category: "EMPLOYMENT_CONTRACT" as const,
    kind: "LETTER" as const,
    staffRole: role,
    sortOrder: index + 1,
    body: contractBody(ROLE_CLAUSES[role] || ROLE_CLAUSES.default),
  })),
  {
    slug: "disciplinary-written-warning",
    name: "Disciplinary — written warning",
    category: "DISCIPLINARY_WARNING",
    kind: "LETTER",
    sortOrder: 0,
    body: DISCIPLINARY_BODY,
  },
  {
    slug: "disciplinary-final-warning",
    name: "Disciplinary — final written warning",
    category: "FINAL_WRITTEN_WARNING",
    kind: "LETTER",
    sortOrder: 0,
    body: FINAL_WARNING_BODY,
  },
  {
    slug: "onboarding-checklist",
    name: "Onboarding checklist",
    category: "ONBOARDING_CHECKLIST",
    kind: "CHECKLIST",
    sortOrder: 0,
    body: "Complete all required items before the employee's first payroll cycle.",
    checklistItems: ONBOARDING_ITEMS,
  },
  {
    slug: "offboarding-checklist",
    name: "Offboarding checklist",
    category: "OFFBOARDING_CHECKLIST",
    kind: "CHECKLIST",
    sortOrder: 0,
    body: "Complete before final pay release and account closure.",
    checklistItems: OFFBOARDING_ITEMS,
  },
];

export const BULK_EMPLOYEE_IMPORT_COLUMNS = [
  "email",
  "name",
  "phone",
  "staffRole",
  "staffCountry",
  "branchNames",
  "employeeNumber",
  "employmentType",
  "hireDate",
  "jobTitle",
  "department",
  "basicSalary",
  "housingAllowance",
  "transportAllowance",
  "otherAllowances",
  "ghanaCardId",
  "tin",
  "ssnitNumber",
  "paymentMethod",
  "bankName",
  "bankAccountNo",
  "momoProvider",
  "momoNumber",
] as const;

export function bulkEmployeeImportCsvTemplate(): string {
  const header = BULK_EMPLOYEE_IMPORT_COLUMNS.join(",");
  const example = [
    "staff@cosyaura.com",
    "Ama Mensah",
    "233500000000",
    "FULFILMENT",
    "GH",
    "Accra Showroom",
    "EMP-001",
    "FULL_TIME",
    "2026-01-15",
    "Sales Associate",
    "Retail",
    "2500",
    "200",
    "150",
    "0",
    "GHA-000000000-0",
    "C0000000000",
    "C0000000000",
    "BANK",
    "Ecobank",
    "1234567890",
    "",
    "",
  ].join(",");
  return `${header}\n${example}\n`;
}
