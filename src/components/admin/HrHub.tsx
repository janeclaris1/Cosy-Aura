"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { EmployeeProfilesManager } from "@/components/admin/EmployeeProfilesManager";
import { LeaveManager } from "@/components/admin/LeaveManager";
import { PayrollManager } from "@/components/admin/PayrollManager";
import { StaffManager } from "@/components/admin/StaffManager";

const TAB_DEFS = [
  { id: "staff", label: "Staff", accessKey: "staff" as const },
  { id: "employees", label: "Employees", accessKey: "hr" as const },
  { id: "leave", label: "Leave", accessKey: "hr" as const },
  { id: "payroll", label: "Payroll", accessKey: "payroll" as const },
] as const;

type TabId = (typeof TAB_DEFS)[number]["id"];

export type HrHubAccess = {
  staff: boolean;
  hr: boolean;
  payroll: boolean;
  /** When set, opens this tab first (e.g. payroll for accountants). */
  preferredTab?: TabId;
};

function HrHubInner({ access }: { access: HrHubAccess }) {
  const searchParams = useSearchParams();
  const tabs = useMemo(
    () => TAB_DEFS.filter((t) => access[t.accessKey]),
    [access]
  );

  const paramTab = searchParams.get("tab");
  const initialTab =
    tabs.find((t) => t.id === paramTab)?.id ??
    (access.preferredTab && tabs.some((t) => t.id === access.preferredTab)
      ? access.preferredTab
      : undefined) ??
    tabs[0]?.id ??
    "employees";

  const [tab, setTab] = useState<TabId>(initialTab as TabId);

  useEffect(() => {
    if (paramTab && tabs.some((t) => t.id === paramTab)) {
      setTab(paramTab as TabId);
    }
  }, [paramTab, tabs]);

  if (!tabs.length) {
    return (
      <p className="text-sm font-roboto text-mocha">
        You do not have access to HR or payroll tools.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="inline-flex flex-wrap rounded-2xl bg-[#fafafa] p-1 ring-1 ring-stone-200/80">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-xl px-5 py-2.5 text-sm font-roboto transition-all",
              tab === t.id
                ? "bg-[#03045e] text-white shadow-sm"
                : "text-mocha hover:text-espresso hover:bg-white/80"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "staff" && access.staff && <StaffManager />}
      {tab === "employees" && access.hr && <EmployeeProfilesManager />}
      {tab === "leave" && access.hr && <LeaveManager />}
      {tab === "payroll" && access.payroll && <PayrollManager />}
    </div>
  );
}

export function HrHub({ access }: { access: HrHubAccess }) {
  return (
    <Suspense
      fallback={
        <p className="text-sm font-roboto text-mocha">Loading HR & payroll…</p>
      }
    >
      <HrHubInner access={access} />
    </Suspense>
  );
}
