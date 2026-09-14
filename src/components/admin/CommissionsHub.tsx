"use client";

import { useState } from "react";
import { AdminTabBar } from "@/components/admin/admin-ui";
import { CommissionRulesManager } from "@/components/admin/CommissionRulesManager";
import { StaffCommissionsPanel } from "@/components/admin/StaffCommissionsPanel";

const TABS = [
  { id: "ledger", label: "Commission ledger" },
  { id: "rules", label: "Rules" },
] as const;

export function CommissionsHub({ canEditRules }: { canEditRules: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("ledger");

  return (
    <div className="space-y-5">
      <AdminTabBar tabs={[...TABS]} value={tab} onChange={setTab} />
      {tab === "ledger" && <StaffCommissionsPanel />}
      {tab === "rules" && canEditRules && <CommissionRulesManager />}
      {tab === "rules" && !canEditRules && (
        <p className="text-sm text-mocha">You need HR write access to manage commission rules.</p>
      )}
    </div>
  );
}
