"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, Loader2, Save } from "lucide-react";
import {
  AdminButton,
  AdminSectionTitle,
  adminInputClass,
  adminLabelClass,
} from "@/components/admin/admin-ui";
import { HrDocumentPreviewModal } from "@/components/admin/HrDocumentPreviewModal";
import { readAdminJson } from "@/lib/admin-fetch";
import type { HrDocumentSheetProps } from "@/lib/hr-document";
import { htmlBodyToPlainText } from "@/lib/hr-document-body";
import { HR_MERGE_FIELD_KEYS } from "@/lib/hr-document-merge";

type ChecklistItem = { id: string; label: string; required?: boolean };

type TemplateDetail = {
  id: string;
  name: string;
  body: string;
  kind: string;
  checklistItems: ChecklistItem[] | null;
  version: number;
};

export function HrTemplateEditor({
  templateId,
  canEdit,
  employeeProfileId,
  onSaved,
}: {
  templateId: string;
  canEdit: boolean;
  employeeProfileId?: string;
  onSaved?: () => void;
}) {
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [checklistText, setChecklistText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewSheet, setPreviewSheet] = useState<HrDocumentSheetProps | null>(null);
  const [previewSample, setPreviewSample] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/hr/documents/templates/${templateId}`);
      const result = await readAdminJson<{ template: TemplateDetail }>(res);
      if (!result.ok) throw new Error(result.error);
      const tpl = result.data.template;
      setTemplate(tpl);
      setName(tpl.name);
      setBody(htmlBodyToPlainText(tpl.body));
      const items = Array.isArray(tpl.checklistItems) ? tpl.checklistItems : [];
      setChecklistText(items.map((i) => i.label).join("\n"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load template");
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    void load();
  }, [load]);

  function parseChecklistItems(): ChecklistItem[] {
    return checklistText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((label, index) => ({
        id: `item-${index + 1}`,
        label,
        required: true,
      }));
  }

  async function handleSave() {
    if (!canEdit) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload: Record<string, unknown> = { name, body };
      if (template?.kind === "CHECKLIST") {
        payload.checklistItems = parseChecklistItems();
      }
      const res = await fetch(`/api/admin/hr/documents/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMessage("Template saved.");
      onSaved?.();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    setPreviewing(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        templateId,
        body,
      };
      if (employeeProfileId) payload.employeeProfileId = employeeProfileId;
      const res = await fetch("/api/admin/hr/documents/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed");
      setPreviewSheet(data.sheet);
      setPreviewSample(Boolean(data.sample));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-mocha flex items-center gap-2 py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading template…
      </p>
    );
  }

  if (!template) {
    return <p className="text-sm text-red-700">{error || "Template not found."}</p>;
  }

  return (
    <div className="mt-4 border-t border-wf-border pt-4 space-y-4">
      <AdminSectionTitle title={`Edit: ${template.name}`} className="!mb-0" />
      <p className="text-xs text-mocha">
        Version {template.version} · Plain text body with {"{{field}}"} placeholders. Use a blank line between paragraphs.
      </p>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}

      <label className="block text-sm max-w-xl">
        <span className={adminLabelClass}>Display name</span>
        <input
          className={adminInputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canEdit}
        />
      </label>

      <label className="block text-sm">
        <span className={adminLabelClass}>Body</span>
        <textarea
          className={`${adminInputClass} min-h-[220px] text-sm leading-relaxed`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={!canEdit}
          spellCheck
        />
      </label>

      {template.kind === "CHECKLIST" ? (
        <label className="block text-sm">
          <span className={adminLabelClass}>Checklist items (one per line)</span>
          <textarea
            className={`${adminInputClass} min-h-[140px] text-sm`}
            value={checklistText}
            onChange={(e) => setChecklistText(e.target.value)}
            disabled={!canEdit}
          />
        </label>
      ) : null}

      <details className="text-sm text-mocha">
        <summary className="cursor-pointer font-medium text-espresso">Merge fields reference</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {HR_MERGE_FIELD_KEYS.map((key) => (
            <code key={key} className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">{`{{${key}}}`}</code>
          ))}
        </div>
      </details>

      <div className="flex flex-wrap gap-2">
        <AdminButton
          type="button"
          variant="secondary"
          className="gap-1.5"
          disabled={previewing}
          onClick={() => void handlePreview()}
        >
          <Eye className="h-4 w-4" />
          {previewing ? "Previewing…" : "Preview"}
        </AdminButton>
        {canEdit ? (
          <AdminButton
            type="button"
            className="gap-1.5"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save template"}
          </AdminButton>
        ) : null}
      </div>

      {previewSheet ? (
        <HrDocumentPreviewModal
          sheet={previewSheet}
          sample={previewSample}
          onClose={() => setPreviewSheet(null)}
        />
      ) : null}
    </div>
  );
}
