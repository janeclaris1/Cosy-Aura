"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminSectionTitle,
  AdminTableWrap,
  adminInputClass,
  adminLabelClass,
  adminSelectClass,
  adminTableClass,
  adminTdClass,
  adminThClass,
  adminTheadClass,
  adminTrClass,
} from "@/components/admin/admin-ui";
import { readAdminJson } from "@/lib/admin-fetch";
import { employmentTypeLabel } from "@/lib/payroll-gh";
import { formatPrice } from "@/lib/utils";
import { staffRoleLabel } from "@/lib/rbac";

type StaffUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  staffRole: string | null;
  staffCountry: string | null;
  activeStaff: boolean;
  staffAssignments: Array<{
    branchId: string;
    branch: { id: string; name: string; country: string };
  }>;
};

type EmployeeProfile = {
  id: string;
  userId: string;
  employeeNumber: string | null;
  employmentType: string;
  hireDate: string | null;
  jobTitle: string | null;
  department: string | null;
  ghanaCardId: string | null;
  tin: string | null;
  ssnitNumber: string | null;
  paymentMethod: string;
  bankName: string | null;
  bankAccountNo: string | null;
  momoProvider: string | null;
  momoNumber: string | null;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  payFrequency: string;
  notes: string | null;
  leaveBalances: Array<{ entitled: number; used: number }>;
};

type Row = { user: StaffUser; profile: EmployeeProfile | null };

const emptyForm = {
  userId: "",
  employeeNumber: "",
  employmentType: "FULL_TIME",
  hireDate: "",
  jobTitle: "",
  department: "",
  ghanaCardId: "",
  tin: "",
  ssnitNumber: "",
  paymentMethod: "BANK",
  bankName: "",
  bankAccountNo: "",
  bankBranch: "",
  momoProvider: "",
  momoNumber: "",
  basicSalary: "0",
  housingAllowance: "0",
  transportAllowance: "0",
  otherAllowances: "0",
  payFrequency: "MONTHLY",
  notes: "",
};

export function EmployeeProfilesManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/hr/employees");
      const result = await readAdminJson<{ employees?: Row[] }>(res);
      if (!result.ok) throw new Error(result.error);
      setRows(result.data.employees || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(row: Row) {
    const p = row.profile;
    setEditing(true);
    setForm({
      userId: row.user.id,
      employeeNumber: p?.employeeNumber || "",
      employmentType: p?.employmentType || "FULL_TIME",
      hireDate: p?.hireDate ? p.hireDate.slice(0, 10) : "",
      jobTitle: p?.jobTitle || "",
      department: p?.department || "",
      ghanaCardId: p?.ghanaCardId || "",
      tin: p?.tin || "",
      ssnitNumber: p?.ssnitNumber || "",
      paymentMethod: p?.paymentMethod || "BANK",
      bankName: p?.bankName || "",
      bankAccountNo: p?.bankAccountNo || "",
      bankBranch: "",
      momoProvider: p?.momoProvider || "",
      momoNumber: p?.momoNumber || "",
      basicSalary: String(p?.basicSalary ?? 0),
      housingAllowance: String(p?.housingAllowance ?? 0),
      transportAllowance: String(p?.transportAllowance ?? 0),
      otherAllowances: String(p?.otherAllowances ?? 0),
      payFrequency: p?.payFrequency || "MONTHLY",
      notes: p?.notes || "",
    });
    setMessage(null);
    setError(null);
  }

  function startNew(row: Row) {
    setEditing(false);
    setForm({ ...emptyForm, userId: row.user.id });
    setMessage(null);
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/hr/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          basicSalary: Number(form.basicSalary),
          housingAllowance: Number(form.housingAllowance),
          transportAllowance: Number(form.transportAllowance),
          otherAllowances: Number(form.otherAllowances),
        }),
      });
      const result = await readAdminJson(res);
      if (!result.ok) throw new Error(result.error);
      setMessage("Employee profile saved.");
      setForm(emptyForm);
      setEditing(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const selectedUser = rows.find((r) => r.user.id === form.userId)?.user;

  return (
    <div className="space-y-4">
      <AdminSectionTitle
        title="Employee profiles"
        description="Link HR records and compensation to existing staff accounts. Payroll uses these figures with attendance data."
      />

      {error && (
        <p className="text-sm font-roboto text-red-700 bg-red-50 px-3 py-2">{error}</p>
      )}
      {message && (
        <p className="text-sm font-roboto text-emerald-800 bg-emerald-50 px-3 py-2">{message}</p>
      )}

      <AdminTableWrap>
        <table className={adminTableClass}>
          <thead className={adminTheadClass}>
            <tr>
              <th className={adminThClass}>Staff</th>
              <th className={adminThClass}>Role</th>
              <th className={adminThClass}>Profile</th>
              <th className={adminThClass}>Basic</th>
              <th className={adminThClass}>Leave</th>
              <th className={adminThClass} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className={adminTdClass}>
                  <AdminEmptyState message="Loading…" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className={adminTdClass}>
                  <AdminEmptyState message="No staff found in your scope." />
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const gross =
                  (row.profile?.basicSalary || 0) +
                  (row.profile?.housingAllowance || 0) +
                  (row.profile?.transportAllowance || 0) +
                  (row.profile?.otherAllowances || 0);
                const leave = row.profile?.leaveBalances?.[0];
                return (
                  <tr key={row.user.id} className={adminTrClass}>
                    <td className={adminTdClass}>
                      <p className="font-medium text-espresso">
                        {row.user.name || row.user.email}
                      </p>
                      <p className="text-xs text-mocha">{row.user.email}</p>
                    </td>
                    <td className={adminTdClass}>
                      <p>{staffRoleLabel(row.user.staffRole as never)}</p>
                      <p className="text-xs text-mocha">{row.user.staffCountry || "—"}</p>
                    </td>
                    <td className={adminTdClass}>
                      {row.profile ? (
                        <>
                          <p>{employmentTypeLabel(row.profile.employmentType)}</p>
                          <p className="text-xs text-mocha">
                            {row.profile.jobTitle || "No title"}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs text-amber-700">Not set up</span>
                      )}
                    </td>
                    <td className={adminTdClass}>
                      {row.profile ? formatPrice(gross) : "—"}
                    </td>
                    <td className={adminTdClass}>
                      {leave
                        ? `${leave.used}/${leave.entitled} days`
                        : row.profile
                          ? "0/15 days"
                          : "—"}
                    </td>
                    <td className={adminTdClass}>
                      <AdminButton
                        type="button"
                        variant="ghost"
                        className="!px-3 !py-1.5 text-xs"
                        onClick={() =>
                          row.profile ? startEdit(row) : startNew(row)
                        }
                      >
                        {row.profile ? "Edit" : "Set up"}
                      </AdminButton>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </AdminTableWrap>

      {form.userId && (
        <AdminCard>
          <AdminSectionTitle
            title={editing ? "Edit employee profile" : "New employee profile"}
            description={
              selectedUser
                ? `${selectedUser.name || selectedUser.email} · ${selectedUser.staffCountry || "GH"}`
                : undefined
            }
          />
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={adminLabelClass}>Employment type</label>
              <select
                className={adminSelectClass}
                value={form.employmentType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, employmentType: e.target.value }))
                }
              >
                <option value="FULL_TIME">Full time</option>
                <option value="PART_TIME">Part time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </select>
            </div>
            <div>
              <label className={adminLabelClass}>Employee number</label>
              <input
                className={adminInputClass}
                value={form.employeeNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, employeeNumber: e.target.value }))
                }
                placeholder="CA-001"
              />
            </div>
            <div>
              <label className={adminLabelClass}>Hire date</label>
              <input
                type="date"
                className={adminInputClass}
                value={form.hireDate}
                onChange={(e) => setForm((f) => ({ ...f, hireDate: e.target.value }))}
              />
            </div>
            <div>
              <label className={adminLabelClass}>Job title</label>
              <input
                className={adminInputClass}
                value={form.jobTitle}
                onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
              />
            </div>
            <div>
              <label className={adminLabelClass}>Department</label>
              <input
                className={adminInputClass}
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              />
            </div>
            <div>
              <label className={adminLabelClass}>Pay frequency</label>
              <select
                className={adminSelectClass}
                value={form.payFrequency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, payFrequency: e.target.value }))
                }
              >
                <option value="MONTHLY">Monthly</option>
                <option value="BIWEEKLY">Bi-weekly</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </div>

            <div className="sm:col-span-2 border-t border-stone-100 pt-4">
              <p className="text-xs uppercase tracking-wider text-mocha mb-3">
                Compensation (GHS / month)
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={adminLabelClass}>Basic salary</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className={adminInputClass}
                    value={form.basicSalary}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, basicSalary: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className={adminLabelClass}>Housing allowance</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className={adminInputClass}
                    value={form.housingAllowance}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, housingAllowance: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className={adminLabelClass}>Transport allowance</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className={adminInputClass}
                    value={form.transportAllowance}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, transportAllowance: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className={adminLabelClass}>Other allowances</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className={adminInputClass}
                    value={form.otherAllowances}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, otherAllowances: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 border-t border-stone-100 pt-4">
              <p className="text-xs uppercase tracking-wider text-mocha mb-3">
                Ghana compliance & payment
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className={adminLabelClass}>Ghana Card</label>
                  <input
                    className={adminInputClass}
                    value={form.ghanaCardId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ghanaCardId: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className={adminLabelClass}>TIN</label>
                  <input
                    className={adminInputClass}
                    value={form.tin}
                    onChange={(e) => setForm((f) => ({ ...f, tin: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={adminLabelClass}>SSNIT number</label>
                  <input
                    className={adminInputClass}
                    value={form.ssnitNumber}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ssnitNumber: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 mt-3">
                <div>
                  <label className={adminLabelClass}>Payment method</label>
                  <select
                    className={adminSelectClass}
                    value={form.paymentMethod}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, paymentMethod: e.target.value }))
                    }
                  >
                    <option value="BANK">Bank transfer</option>
                    <option value="MOMO">Mobile money</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
                {form.paymentMethod === "BANK" ? (
                  <>
                    <div>
                      <label className={adminLabelClass}>Bank name</label>
                      <input
                        className={adminInputClass}
                        value={form.bankName}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, bankName: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className={adminLabelClass}>Account number</label>
                      <input
                        className={adminInputClass}
                        value={form.bankAccountNo}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, bankAccountNo: e.target.value }))
                        }
                      />
                    </div>
                  </>
                ) : form.paymentMethod === "MOMO" ? (
                  <>
                    <div>
                      <label className={adminLabelClass}>MoMo provider</label>
                      <input
                        className={adminInputClass}
                        value={form.momoProvider}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, momoProvider: e.target.value }))
                        }
                        placeholder="MTN / Telecel / AT"
                      />
                    </div>
                    <div>
                      <label className={adminLabelClass}>MoMo number</label>
                      <input
                        className={adminInputClass}
                        value={form.momoNumber}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, momoNumber: e.target.value }))
                        }
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div className="sm:col-span-2 flex flex-wrap gap-2 pt-2">
              <AdminButton type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save profile"}
              </AdminButton>
              <AdminButton
                type="button"
                variant="ghost"
                onClick={() => {
                  setForm(emptyForm);
                  setEditing(false);
                }}
              >
                Cancel
              </AdminButton>
            </div>
          </form>
        </AdminCard>
      )}
    </div>
  );
}
