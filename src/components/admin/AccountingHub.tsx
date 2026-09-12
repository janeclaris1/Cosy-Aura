"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminTabBar } from "@/components/admin/admin-ui";
import { AccountingCoaPanel } from "@/components/admin/AccountingCoaPanel";
import { AccountingExpenseForm } from "@/components/admin/AccountingExpenseForm";
import { AccountingJournalsPanel } from "@/components/admin/AccountingJournalsPanel";
import { AccountingReportsPanel } from "@/components/admin/AccountingReportsPanel";

const TABS = [
  { id: "expenses", label: "Record expense" },
  { id: "journals", label: "Journal" },
  { id: "reports", label: "Reports" },
  { id: "coa", label: "Chart of accounts" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function AccountingHubInner() {
  const searchParams = useSearchParams();
  const paramTab = searchParams.get("tab");
  const initial =
    TABS.find((t) => t.id === paramTab)?.id ?? ("expenses" as TabId);
  const [tab, setTab] = useState<TabId>(initial);
  const [journalRefresh, setJournalRefresh] = useState(0);

  return (
    <div className="space-y-5">
      <AdminTabBar tabs={TABS} value={tab} onChange={setTab} />

      {tab === "expenses" && (
        <AccountingExpenseForm onRecorded={() => setJournalRefresh((k) => k + 1)} />
      )}
      {tab === "journals" && <AccountingJournalsPanel refreshKey={journalRefresh} />}
      {tab === "reports" && <AccountingReportsPanel />}
      {tab === "coa" && <AccountingCoaPanel />}
    </div>
  );
}

export function AccountingHub() {
  return (
    <Suspense fallback={<p className="text-sm text-mocha">Loading accounting…</p>}>
      <AccountingHubInner />
    </Suspense>
  );
}
