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
import { readAdminJson } from "@/lib/admin-fetch";
import {
  STAFF_ROLE_GROUPS,
  staffRoleDescription,
  staffRoleLabel,
  staffRoleNeedsCountry,
} from "@/lib/rbac";
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
  password: "",
  confirmPassword: "",
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
  const [passwordTarget, setPasswordTarget] = useState<StaffRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function load() {
    setError(null);
    try {
      const [staffRes, branchRes] = await Promise.all([
        fetch("/api/admin/staff"),
        fetch("/api/admin/branches"),
      ]);
      const staffResult = await readAdminJson<{ staff?: StaffRow[] }>(staffRes);
      const branchResult = await readAdminJson<{ branches?: Branch[] }>(branchRes);

      if (staffResult.ok) {
        setStaff(staffResult.data.staff || []);
      } else {
        setError(staffResult.error);
        setStaff([]);
      }

      if (branchResult.ok) {
        setBranches(branchResult.data.branches || []);
      } else if (!staffResult.ok) {
        setError(branchResult.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load staff");
      setStaff([]);
    }
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
      const result = await readAdminJson(res);
      if (!result.ok) throw new Error(result.error);
      setMessage(
        editing
          ? "Staff updated."
          : "Staff added. Share their login password with them directly — we never email passwords."
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
    const result = await readAdminJson(res);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await load();
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordTarget) return;
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: passwordTarget.email,
          setPassword: true,
          password: newPassword,
          confirmPassword,
        }),
      });
      const result = await readAdminJson(res);
      if (!result.ok) throw new Error(result.error);
      setMessage(`Password updated for ${passwordTarget.email}. Share it with them securely.`);
      setPasswordTarget(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set password");
    } finally {
      setSaving(false);
    }
  }

  const needsBranch =
    form.staffRole === "BRANCH_MANAGER" || form.staffRole === "FULFILMENT";
  const needsCountry = staffRoleNeedsCountry(form.staffRole);

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <AdminCard>
        <form onSubmit={save} className="space-y-3">
        <AdminSectionTitle
          title={editing ? "Edit staff" : "Invite / update staff"}
          className="!mb-3"
        />
        <p className="text-xs text-mocha">
          Super Admin is only you (via SUPER_ADMIN_EMAILS). Assign{" "}
          <strong>HR</strong>, <strong>Accountant</strong>, and other portal roles here.
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
          <>
            <label className="block">
              <span className={adminLabelClass}>Password</span>
              <input
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={adminInputClass}
                autoComplete="new-password"
                placeholder="Min 8 characters"
              />
            </label>
            <label className="block">
              <span className={adminLabelClass}>Confirm password</span>
              <input
                required
                type="password"
                minLength={8}
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                className={adminInputClass}
                autoComplete="new-password"
              />
            </label>
            <p className="text-xs text-mocha">
              Only Super Admin can set staff passwords. Share credentials with the
              team member directly — passwords are never emailed.
            </p>
          </>
        ) : null}
        <label className="block">
          <span className={adminLabelClass}>Role</span>
          <select
            value={form.staffRole}
            onChange={(e) => setForm({ ...form, staffRole: e.target.value })}
            className={adminSelectClass}
          >
            {STAFF_ROLE_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.roles.map((role) => (
                  <option key={role} value={role}>
                    {staffRoleLabel(role)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {staffRoleDescription(form.staffRole as never) ? (
            <p className="mt-1.5 text-xs text-mocha">
              {staffRoleDescription(form.staffRole as never)}
            </p>
          ) : null}
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
                  onClick={() => {
                    setPasswordTarget(row);
                    setNewPassword("");
                    setConfirmPassword("");
                    setError(null);
                    setMessage(null);
                  }}
                >
                  Set password
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

      {passwordTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <AdminCard className="w-full max-w-md">
            <AdminSectionTitle
              title="Set staff password"
              description={`${passwordTarget.name || passwordTarget.email} · Only Super Admin can do this.`}
              className="!mb-4"
            />
            <form onSubmit={savePassword} className="space-y-3">
              <label className="block">
                <span className={adminLabelClass}>New password</span>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={adminInputClass}
                  autoComplete="new-password"
                />
              </label>
              <label className="block">
                <span className={adminLabelClass}>Confirm password</span>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={adminInputClass}
                  autoComplete="new-password"
                />
              </label>
              <div className="flex gap-2 pt-1">
                <AdminButton type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save password"}
                </AdminButton>
                <AdminButton
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setPasswordTarget(null);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                >
                  Cancel
                </AdminButton>
              </div>
            </form>
          </AdminCard>
        </div>
      ) : null}
    </div>
  );
}
