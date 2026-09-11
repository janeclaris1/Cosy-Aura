"use client";

import { useEffect, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminSectionTitle,
  adminInputClass,
  adminLabelClass,
  adminSelectClass,
} from "@/components/admin/admin-ui";
import { STAFF_ROLES, staffRoleLabel } from "@/lib/rbac";
import { StaffAvatar } from "@/components/admin/StaffAvatar";

type Branch = { id: string; name: string; country: string };
type StaffRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  image: string | null;
  staffRole: string | null;
  staffCountry: string | null;
  activeStaff: boolean;
  isSuperAdmin?: boolean;
  staffAssignments: Array<{
    branchId: string;
    branch: { id: string; name: string; country: string };
  }>;
};

const empty = {
  email: "",
  name: "",
  phone: "",
  staffRole: "FULFILMENT" as string,
  staffCountry: "GH",
  branchIds: [] as string[],
  activeStaff: true,
};

export function StaffManager() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [staffRes, branchRes] = await Promise.all([
      fetch("/api/admin/staff"),
      fetch("/api/admin/branches"),
    ]);
    const staffData = await staffRes.json();
    const branchData = await branchRes.json();
    if (staffRes.ok) setStaff(staffData.staff || []);
    if (branchRes.ok) setBranches(branchData.branches || []);
  }

  useEffect(() => {
    void load();
  }, []);

  function toggleBranch(id: string) {
    setForm((prev) => ({
      ...prev,
      branchIds: prev.branchIds.includes(id)
        ? prev.branchIds.filter((b) => b !== id)
        : [...prev.branchIds, id],
    }));
  }

  function startEdit(row: StaffRow) {
    if (row.isSuperAdmin) return;
    setEditing(true);
    setForm({
      email: row.email,
      name: row.name || "",
      phone: row.phone || "",
      staffRole: row.staffRole || "FULFILMENT",
      staffCountry: row.staffCountry || "GH",
      branchIds: row.staffAssignments.map((a) => a.branchId),
      activeStaff: row.activeStaff,
    });
    setError(null);
    setMessage(null);
  }

  function resetForm() {
    setEditing(false);
    setForm(empty);
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save staff");
      setMessage(
        editing
          ? "Staff updated."
          : "Invite sent — they will receive a link to set their password."
      );
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(row: StaffRow) {
    if (row.isSuperAdmin) return;
    if (!confirm(`Deactivate ${row.email}? They will lose admin access.`)) return;
    setError(null);
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: row.email,
        name: row.name,
        phone: row.phone,
        staffRole: row.staffRole,
        staffCountry: row.staffCountry,
        branchIds: row.staffAssignments.map((a) => a.branchId),
        activeStaff: false,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not deactivate");
      return;
    }
    await load();
  }

  async function resetPassword(row: StaffRow) {
    if (row.isSuperAdmin) return;
    if (
      !confirm(
        `Send a password reset link to ${row.email}? They will set a new password themselves (we never email passwords).`
      )
    ) {
      return;
    }
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: row.email,
        sendResetLink: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not send reset link");
      return;
    }
    setMessage(`Password reset link sent to ${row.email}.`);
  }

  const needsBranch =
    form.staffRole === "BRANCH_MANAGER" || form.staffRole === "FULFILMENT";
  const needsCountry = form.staffRole === "COUNTRY_MANAGER";

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <AdminCard>
        <form onSubmit={save} className="space-y-3">
        <AdminSectionTitle
          title={editing ? "Edit staff" : "Invite / update staff"}
          className="!mb-3"
        />
        <p className="text-xs text-mocha">
          Super Admin is only you (via SUPER_ADMIN_EMAILS). Other roles are assigned here.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}
        <label className="block">
          <span className={adminLabelClass}>Email</span>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={adminInputClass}
            disabled={editing}
          />
        </label>
        <label className="block">
          <span className={adminLabelClass}>Name</span>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={adminInputClass}
          />
        </label>
        <label className="block">
          <span className={adminLabelClass}>Phone</span>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={adminInputClass}
          />
        </label>
        {!editing ? (
          <p className="text-xs text-mocha">
            New staff get an email with a secure link to set their own password.
            Passwords are never sent in plain text.
          </p>
        ) : null}
        <label className="block">
          <span className={adminLabelClass}>Role</span>
          <select
            value={form.staffRole}
            onChange={(e) => setForm({ ...form, staffRole: e.target.value })}
            className={adminSelectClass}
          >
            {STAFF_ROLES.map((role) => (
              <option key={role} value={role}>
                {staffRoleLabel(role)}
              </option>
            ))}
          </select>
        </label>
        {needsCountry ? (
          <label className="block">
            <span className={adminLabelClass}>Country scope</span>
            <select
              value={form.staffCountry}
              onChange={(e) => setForm({ ...form, staffCountry: e.target.value })}
              className={adminSelectClass}
            >
              <option value="GH">Ghana</option>
              <option value="CM">Cameroon</option>
            </select>
          </label>
        ) : null}
        {needsBranch ? (
          <fieldset className="text-sm space-y-2">
            <legend>Branches</legend>
            {branches.map((branch) => (
              <label key={branch.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.branchIds.includes(branch.id)}
                  onChange={() => toggleBranch(branch.id)}
                />
                {branch.name} ({branch.country})
              </label>
            ))}
          </fieldset>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.activeStaff}
            onChange={(e) => setForm({ ...form, activeStaff: e.target.checked })}
          />
          Active
        </label>
        <div className="flex gap-2">
          <AdminButton type="submit" disabled={saving}>
            {saving ? "Saving…" : editing ? "Update staff" : "Save staff"}
          </AdminButton>
          {editing ? (
            <AdminButton type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </AdminButton>
          ) : null}
        </div>
        </form>
      </AdminCard>

      <div className="space-y-3">
        {staff.map((row) => (
          <AdminCard
            key={row.id}
            className="flex justify-between gap-4"
          >
            <div className="flex gap-3 min-w-0">
              <StaffAvatar
                name={row.name}
                email={row.email}
                image={row.image}
                size="md"
                className="mt-0.5"
              />
              <div className="min-w-0">
              <p className="font-medium text-sm">
                {row.name || row.email}
                {row.isSuperAdmin ? (
                  <span className="ml-2 text-xs text-[#03045e] font-medium">Super Admin</span>
                ) : null}
              </p>
              <p className="text-xs text-mocha mt-0.5">{row.email}</p>
              <p className="text-xs text-mocha mt-1">
                {row.isSuperAdmin
                  ? "Full access (env)"
                  : `${staffRoleLabel(row.staffRole as never)} · ${
                      row.activeStaff ? "Active" : "Inactive"
                    }`}
                {row.staffCountry ? ` · ${row.staffCountry}` : ""}
              </p>
              {row.staffAssignments.length ? (
                <p className="text-xs text-mocha mt-1">
                  Branches:{" "}
                  {row.staffAssignments.map((a) => a.branch.name).join(", ")}
                </p>
              ) : null}
              </div>
            </div>
            {!row.isSuperAdmin ? (
              <div className="flex flex-col gap-2 text-xs shrink-0">
                <button
                  type="button"
                  className="text-[#03045e] hover:underline font-medium"
                  onClick={() => startEdit(row)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-[#03045e] hover:underline font-medium"
                  onClick={() => void resetPassword(row)}
                >
                  Send reset link
                </button>
                {row.activeStaff ? (
                  <button
                    type="button"
                    className="underline text-red-600"
                    onClick={() => void deactivate(row)}
                  >
                    Deactivate
                  </button>
                ) : null}
              </div>
            ) : null}
          </AdminCard>
        ))}
        {!staff.length ? <p className="text-sm text-mocha">No admin staff yet.</p> : null}
      </div>
    </div>
  );
}
