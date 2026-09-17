import type {
  EmployeeProfile,
  HrDocumentCategory,
  HrDocumentTemplate,
  User,
} from "@prisma/client";
import { mergeAndFormatHrDocumentBody } from "@/lib/hr-document-body";
import { buildHrMergeFields, type HrMergeContext } from "@/lib/hr-document-merge";
import { hrCompanyLetterhead, letterheadRegistrationLines } from "@/lib/hr-company-letterhead";

export type HrDocumentSheetProps = {
  title: string;
  category: HrDocumentCategory;
  kind: "LETTER" | "CHECKLIST";
  letterhead: ReturnType<typeof hrCompanyLetterhead>;
  registrationLines: string[];
  bodyHtml: string;
  checklistItems?: Array<{ id: string; label: string; required?: boolean }>;
  checklistProgress?: Record<string, boolean>;
  employeeName: string;
  generatedAt: Date | string;
  footerWording: string;
};

export function hrDocumentDateLabel(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function buildHrDocumentSheetProps(input: {
  template: Pick<
    HrDocumentTemplate,
    "name" | "category" | "kind" | "body" | "checklistItems"
  >;
  renderedBody: string;
  employeeName: string;
  country: string;
  checklistProgress?: Record<string, boolean> | null;
  generatedAt?: Date;
}): HrDocumentSheetProps {
  const letterhead = hrCompanyLetterhead(input.country);
  const checklistItems = Array.isArray(input.template.checklistItems)
    ? (input.template.checklistItems as Array<{
        id: string;
        label: string;
        required?: boolean;
      }>)
    : undefined;

  return {
    title: input.template.name,
    category: input.template.category,
    kind: input.template.kind,
    letterhead,
    registrationLines: letterheadRegistrationLines(letterhead),
    bodyHtml: input.renderedBody,
    checklistItems,
    checklistProgress: input.checklistProgress ?? undefined,
    employeeName: input.employeeName,
    generatedAt: input.generatedAt ?? new Date(),
    footerWording: letterhead.footerWording,
  };
}

export function renderHrDocumentForEmployee(input: {
  template: HrDocumentTemplate;
  employee: EmployeeProfile;
  user: Pick<User, "name" | "email" | "phone" | "staffRole" | "staffCountry">;
  branches: string[];
  extra?: Record<string, string>;
}): { renderedBody: string; mergeData: Record<string, string> } {
  const ctx: HrMergeContext = {
    employee: input.employee,
    user: input.user,
    branches: input.branches,
    country: input.user.staffCountry || input.template.country || "GH",
    extra: input.extra,
  };
  const mergeData = buildHrMergeFields(ctx);
  const renderedBody = mergeAndFormatHrDocumentBody(input.template.body, mergeData);
  return { renderedBody, mergeData };
}

export function pickEmploymentContractTemplate(
  templates: HrDocumentTemplate[],
  staffRole: string | null | undefined
): HrDocumentTemplate | null {
  const contracts = templates.filter(
    (t) => t.category === "EMPLOYMENT_CONTRACT" && t.active
  );
  if (!staffRole) {
    return contracts.find((t) => !t.staffRole) ?? contracts[0] ?? null;
  }
  return (
    contracts.find((t) => t.staffRole === staffRole) ??
    contracts.find((t) => !t.staffRole) ??
    contracts[0] ??
    null
  );
}

export const HR_DOCUMENT_CATEGORY_ORDER: HrDocumentCategory[] = [
  "OFFER_LETTER",
  "EMPLOYMENT_CONTRACT",
  "DISCIPLINARY_WARNING",
  "FINAL_WRITTEN_WARNING",
  "ONBOARDING_CHECKLIST",
  "OFFBOARDING_CHECKLIST",
];

export function sortTemplatesByCategory<T extends { category: HrDocumentCategory }>(
  templates: T[]
): T[] {
  return [...templates].sort((a, b) => {
    const ai = HR_DOCUMENT_CATEGORY_ORDER.indexOf(a.category);
    const bi = HR_DOCUMENT_CATEGORY_ORDER.indexOf(b.category);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

export function hrDocumentCategoryLabel(category: HrDocumentCategory): string {
  switch (category) {
    case "OFFER_LETTER":
      return "Offer letter";
    case "EMPLOYMENT_CONTRACT":
      return "Employment contract";
    case "DISCIPLINARY_WARNING":
      return "Disciplinary warning";
    case "FINAL_WRITTEN_WARNING":
      return "Final written warning";
    case "ONBOARDING_CHECKLIST":
      return "Onboarding checklist";
    case "OFFBOARDING_CHECKLIST":
      return "Offboarding checklist";
    default:
      return category;
  }
}
