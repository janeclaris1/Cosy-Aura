"use client";

import { useState } from "react";
import { PayslipPrintActions } from "@/components/admin/PayslipPrintActions";
import { HrDocumentSheet } from "@/components/admin/HrDocumentSheet";
import type { HrDocumentSheetProps } from "@/lib/hr-document";
import { AdminButton } from "@/components/admin/admin-ui";

export function HrDocumentPrintClient({
  instanceId,
  initialSheet,
  canEditChecklist,
}: {
  instanceId: string;
  initialSheet: HrDocumentSheetProps;
  canEditChecklist: boolean;
}) {
  const [sheet, setSheet] = useState(initialSheet);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function toggleChecklistItem(itemId: string) {
    if (!canEditChecklist || sheet.kind !== "CHECKLIST") return;
    const next = {
      ...(sheet.checklistProgress || {}),
      [itemId]: !sheet.checklistProgress?.[itemId],
    };
    setSheet((prev) => ({ ...prev, checklistProgress: next }));
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/hr/documents/instances/${instanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistProgress: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMessage("Checklist saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PayslipPrintActions backHref="/admin/hr?tab=documents" backLabel="← Back to HR documents" />
      {canEditChecklist && sheet.kind === "CHECKLIST" ? (
        <p className="hr-doc-no-print text-xs text-mocha mb-3">
          {saving ? "Saving…" : message || "Click checklist items below to mark complete (saved automatically)."}
        </p>
      ) : null}
      {sheet.kind === "CHECKLIST" && sheet.checklistItems?.length ? (
        <div className="hr-doc-no-print mb-4 space-y-2">
          {sheet.checklistItems.map((item) => {
            const done = sheet.checklistProgress?.[item.id];
            return (
              <label
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-wf-border bg-white px-3 py-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={Boolean(done)}
                  disabled={!canEditChecklist || saving}
                  onChange={() => void toggleChecklistItem(item.id)}
                  className="mt-0.5"
                />
                <span>
                  {item.label}
                  {item.required ? " *" : ""}
                </span>
              </label>
            );
          })}
          <AdminButton type="button" variant="secondary" onClick={() => window.print()}>
            Print checklist
          </AdminButton>
        </div>
      ) : null}
      <HrDocumentSheet doc={sheet} />
    </div>
  );
}
