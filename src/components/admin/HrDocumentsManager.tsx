"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, FileText, History, Upload, Wand2 } from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminSectionBar,
  AdminSectionTitle,
  AdminTabBar,
  adminInputClass,
  adminLabelClass,
  adminSelectClass,
} from "@/components/admin/admin-ui";
import { HrTemplateEditor } from "@/components/admin/HrTemplateEditor";
import { readAdminJson } from "@/lib/admin-fetch";
import {
  HR_DOCUMENT_CATEGORY_ORDER,
  hrDocumentCategoryLabel,
} from "@/lib/hr-document";
import { cn } from "@/lib/utils";

type TemplateRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  kind: string;
  staffRole: string | null;
};

type EmployeeRow = {
  user: { id: string; name: string | null; email: string; staffRole: string | null };
  profile: { id: string; employeeNumber: string | null } | null;
};

type ImportResult = { email: string; ok: boolean; error?: string };

type HistoryRow = {
  id: string;
  generatedAt: string;
  templateName: string;
  category: string;
  employeeName: string;
  employeeNumber: string | null;
  printUrl: string;
};

const DOC_TABS = [
  { id: "generate", label: "Generate" },
  { id: "templates", label: "Template library" },
  { id: "history", label: "History" },
  { id: "import", label: "Bulk import" },
] as const;

type DocTab = (typeof DOC_TABS)[number]["id"];

export function HrDocumentsManager({ canEdit }: { canEdit: boolean }) {
  const [tab, setTab] = useState<DocTab>("templates");
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [employeeProfileId, setEmployeeProfileId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);

  const loadCore = useCallback(async () => {
    setLoading(true);
    try {
      const [tplRes, empRes] = await Promise.all([
        fetch("/api/admin/hr/documents/templates"),
        fetch("/api/admin/hr/employees"),
      ]);
      const tplResult = await readAdminJson<{ templates: TemplateRow[] }>(tplRes);
      const empResult = await readAdminJson<{ employees: EmployeeRow[] }>(empRes);
      if (!tplResult.ok) throw new Error(tplResult.error);
      if (!empResult.ok) throw new Error(empResult.error);
      setTemplates(tplResult.data.templates || []);
      setEmployees(empResult.data.employees || []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not load HR documents");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/admin/hr/documents/instances?limit=50");
      const result = await readAdminJson<{ instances: HistoryRow[] }>(res);
      if (!result.ok) throw new Error(result.error);
      setHistory(result.data.instances || []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not load history");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    if (tab === "history") void loadHistory();
  }, [tab, loadHistory]);

  const employeesWithProfiles = useMemo(
    () => employees.filter((e) => e.profile?.id),
    [employees]
  );

  const templatesByCategory = useMemo(() => {
    const map = new Map<string, TemplateRow[]>();
    for (const t of templates) {
      const list = map.get(t.category) || [];
      list.push(t);
      map.set(t.category, list);
    }
    for (const [key, list] of map) {
      map.set(
        key,
        [...list].sort((a, b) => a.name.localeCompare(b.name))
      );
    }
    return map;
  }, [templates]);

  const orderedCategories = useMemo(
    () =>
      HR_DOCUMENT_CATEGORY_ORDER.filter((cat) => templatesByCategory.has(cat)),
    [templatesByCategory]
  );

  function selectTemplate(id: string) {
    setSelectedTemplateId(id);
    setTemplateId(id);
    setTab("templates");
  }

  async function handleGenerate() {
    if (!templateId || !employeeProfileId) {
      setMessage("Select an employee and a template.");
      setTab("generate");
      return;
    }
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/hr/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, employeeProfileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generate failed");
      window.open(data.printUrl, "_blank", "noopener,noreferrer");
      setMessage("Document generated — opened print view in a new tab.");
      void loadHistory();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleImport(file: File) {
    setImporting(true);
    setMessage(null);
    setImportResults(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/hr/documents/import", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setImportResults(data.results || []);
      setMessage(`Imported ${data.imported} of ${data.total} employee row(s).`);
      await loadCore();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-mocha">Loading HR document templates…</p>;
  }

  return (
    <div className="space-y-5">
      {message ? (
        <p className="text-sm text-mocha border border-wf-border bg-white px-3 py-2 rounded-xl">
          {message}
        </p>
      ) : null}

      <AdminTabBar tabs={[...DOC_TABS]} value={tab} onChange={setTab} />

      {tab === "generate" ? (
        <AdminCard>
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="h-5 w-5 text-[#03045e]" />
            <AdminSectionTitle title="Generate HR document" className="!mb-0" />
          </div>
          <p className="text-sm text-mocha mb-4">
            Merge live employee data into a template. For checklists, mark items complete on the print page.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
            <label className="block text-sm">
              <span className={adminLabelClass}>Employee</span>
              <select
                className={adminSelectClass}
                value={employeeProfileId}
                onChange={(e) => setEmployeeProfileId(e.target.value)}
                disabled={!canEdit}
              >
                <option value="">Select employee…</option>
                {employeesWithProfiles.map((row) => (
                  <option key={row.profile!.id} value={row.profile!.id}>
                    {row.user.name || row.user.email}
                    {row.profile?.employeeNumber ? ` · ${row.profile.employeeNumber}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className={adminLabelClass}>Template</span>
              <select
                className={adminSelectClass}
                value={templateId}
                onChange={(e) => {
                  setTemplateId(e.target.value);
                  setSelectedTemplateId(e.target.value || null);
                }}
                disabled={!canEdit}
              >
                <option value="">Select template…</option>
                {orderedCategories.map((category) => (
                  <optgroup
                    key={category}
                    label={hrDocumentCategoryLabel(category)}
                  >
                    {(templatesByCategory.get(category) || []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>
          {canEdit ? (
            <AdminButton
              type="button"
              className="mt-4"
              disabled={generating}
              onClick={() => void handleGenerate()}
            >
              {generating ? "Generating…" : "Generate & print"}
            </AdminButton>
          ) : (
            <p className="text-xs text-mocha mt-3">HR write access required to generate documents.</p>
          )}
        </AdminCard>
      ) : null}

      {tab === "templates" ? (
        <AdminCard>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5 text-[#03045e]" />
            <AdminSectionTitle title="Template library" className="!mb-0" />
          </div>
          {templates.length === 0 ? (
            <AdminEmptyState message="No templates found." />
          ) : (
            <div className="space-y-4">
              {orderedCategories.map((category) => {
                const list = templatesByCategory.get(category) || [];
                return (
                  <div key={category}>
                    <AdminSectionBar title={hrDocumentCategoryLabel(category)} />
                    <ul className="mt-0 divide-y divide-stone-100 border border-t-0 border-wf-border rounded-b-xl overflow-hidden">
                      {list.map((t) => {
                        const active = selectedTemplateId === t.id;
                        return (
                          <li key={t.id}>
                            <button
                              type="button"
                              onClick={() => selectTemplate(t.id)}
                              className={cn(
                                "w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors",
                                active
                                  ? "bg-[#03045e]/5 text-[#03045e]"
                                  : "bg-white hover:bg-stone-50 text-espresso"
                              )}
                            >
                              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="font-medium">{t.name}</span>
                                {t.staffRole ? (
                                  <span className="text-mocha text-xs">
                                    ({t.staffRole.replace(/_/g, " ").toLowerCase()})
                                  </span>
                                ) : null}
                                <span className="text-mocha text-xs">· {t.kind.toLowerCase()}</span>
                              </span>
                              <ChevronRight
                                className={cn(
                                  "h-4 w-4 shrink-0 text-mocha transition-transform",
                                  active && "rotate-90 text-[#03045e]"
                                )}
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}

          {selectedTemplateId ? (
            <HrTemplateEditor
              templateId={selectedTemplateId}
              canEdit={canEdit}
              employeeProfileId={employeeProfileId || undefined}
              onSaved={() => void loadCore()}
            />
          ) : (
            <p className="text-sm text-mocha mt-4">
              Select a template above to preview, edit, or review merge fields.
            </p>
          )}
        </AdminCard>
      ) : null}

      {tab === "history" ? (
        <AdminCard>
          <div className="flex items-center gap-2 mb-3">
            <History className="h-5 w-5 text-[#03045e]" />
            <AdminSectionTitle title="Generated documents" className="!mb-0" />
          </div>
          {loadingHistory ? (
            <p className="text-sm text-mocha">Loading history…</p>
          ) : history.length === 0 ? (
            <AdminEmptyState message="No generated documents yet." />
          ) : (
            <ul className="divide-y divide-stone-100 border border-wf-border rounded-xl overflow-hidden">
              {history.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-espresso">{row.templateName}</p>
                    <p className="text-mocha text-xs">
                      {row.employeeName}
                      {row.employeeNumber ? ` · ${row.employeeNumber}` : ""} ·{" "}
                      {new Date(row.generatedAt).toLocaleString("en-GB")}
                    </p>
                  </div>
                  <AdminButton variant="secondary" href={row.printUrl}>
                    Open
                  </AdminButton>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      ) : null}

      {tab === "import" ? (
        <AdminCard>
          <div className="flex items-center gap-2 mb-3">
            <Upload className="h-5 w-5 text-[#03045e]" />
            <AdminSectionTitle title="Bulk employee import" className="!mb-0" />
          </div>
          <p className="text-sm text-mocha mb-4">
            Download the CSV template, fill employee HR fields, then upload. Staff accounts must already exist (invite via Staff tab first).
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <AdminButton variant="secondary" href="/api/admin/hr/documents/import-template">
              Download CSV template
            </AdminButton>
            {canEdit ? (
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className={adminInputClass}
                  disabled={importing}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleImport(file);
                    e.target.value = "";
                  }}
                />
                {importing ? "Importing…" : "Upload CSV"}
              </label>
            ) : null}
          </div>
          {importResults?.length ? (
            <ul className="mt-4 text-xs space-y-1 max-h-48 overflow-y-auto">
              {importResults.map((r) => (
                <li key={r.email} className={r.ok ? "text-emerald-800" : "text-red-700"}>
                  {r.email}: {r.ok ? "OK" : r.error}
                </li>
              ))}
            </ul>
          ) : null}
        </AdminCard>
      ) : null}
    </div>
  );
}
