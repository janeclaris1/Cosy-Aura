"use client";

import { useEffect, useState } from "react";
import {
  AdminButton,
  AdminTableWrap,
  adminLabelClass,
  adminSelectClass,
  adminTableClass,
  adminTdClass,
  adminThClass,
  adminTheadClass,
  adminTrClass,
} from "@/components/admin/admin-ui";

type Log = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  ipAddress: string | null;
  createdAt: string;
  actor: { email: string; name: string | null } | null;
};

export function AuditLogViewer() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [action, setAction] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load(nextAction = action) {
    setError(null);
    const params = new URLSearchParams({ limit: "60" });
    if (nextAction) params.set("action", nextAction);
    const res = await fetch(`/api/admin/audit?${params}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not load activity");
      return;
    }
    setLogs(data.logs || []);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="block">
          <span className={adminLabelClass}>Action</span>
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              void load(e.target.value);
            }}
            className={`${adminSelectClass} min-w-[12rem]`}
          >
            <option value="">All</option>
            <option value="auth.login">Admin logins</option>
            <option value="auth.login_failed">Failed logins</option>
            <option value="auth.password_set">Password set</option>
            <option value="staff.invite">Staff invites</option>
            <option value="staff.reset_link">Staff reset links</option>
            <option value="staff.update">Staff updates</option>
            <option value="catalog.fragrance.create">Fragrance create</option>
            <option value="catalog.fragrance.update">Fragrance update</option>
            <option value="catalog.fragrance.delete">Fragrance delete</option>
            <option value="settings.update">Settings</option>
            <option value="branch.create">Branch create</option>
            <option value="branch.update">Branch update</option>
            <option value="shipping.create">Shipping create</option>
            <option value="shipping.update">Shipping update</option>
            <option value="stock.update">Stock updates</option>
            <option value="stock.transfer">Transfers</option>
            <option value="stock.transfer.request">Transfer requests</option>
            <option value="stock.transfer.approve">Transfer approvals</option>
            <option value="stock.transfer.reject">Transfer rejections</option>
            <option value="stock.receive">Receive</option>
            <option value="stock.damage">Damage</option>
            <option value="stock.recount">Recount</option>
            <option value="order.status">Order status</option>
            <option value="order.reassign">Order reassign</option>
          </select>
        </label>
        <AdminButton type="button" variant="secondary" onClick={() => void load()}>
          Refresh
        </AdminButton>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <AdminTableWrap>
        <table className={`${adminTableClass} min-w-[820px]`}>
          <thead className={adminTheadClass}>
            <tr>
              <th className={adminThClass}>When</th>
              <th className={adminThClass}>Action</th>
              <th className={adminThClass}>Summary</th>
              <th className={adminThClass}>Actor</th>
              <th className={adminThClass}>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className={adminTrClass}>
                <td className={`${adminTdClass} text-mocha whitespace-nowrap`}>
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className={`${adminTdClass} font-mono text-xs`}>{log.action}</td>
                <td className={adminTdClass}>{log.summary}</td>
                <td className={`${adminTdClass} text-mocha text-xs`}>
                  {log.actor?.name || log.actor?.email || "—"}
                </td>
                <td className={`${adminTdClass} text-mocha text-xs font-mono`}>
                  {log.ipAddress || "—"}
                </td>
              </tr>
            ))}
            {!logs.length ? (
              <tr>
                <td colSpan={5} className={`${adminTdClass} text-center text-mocha`}>
                  No activity yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </AdminTableWrap>
    </div>
  );
}
