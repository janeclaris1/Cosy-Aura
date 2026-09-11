"use client";

import { useState } from "react";
import { AdminCard, AdminSectionTitle } from "@/components/admin/admin-ui";
import type { StoreConfigPayload } from "@/lib/store-config";

export function MaintenanceModeSettings({
  initialEnabled,
  envForced = false,
}: {
  initialEnabled: boolean;
  envForced?: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (envForced) return;
    const next = !enabled;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/store-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenanceMode: next }),
      });
      const data = (await res.json()) as StoreConfigPayload & { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not update maintenance mode");
      setEnabled(Boolean(data.maintenanceMode));
      setMessage(
        data.maintenanceMode
          ? "Maintenance mode is on. Shoppers see the maintenance page."
          : "Maintenance mode is off. The storefront is live again."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const active = envForced || enabled;

  return (
    <AdminCard padding="lg" className="max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <AdminSectionTitle
            title="Maintenance mode"
            description="When enabled, visitors are redirected to the maintenance page. Admin, login, and health checks stay available so you can manage the shop."
          />
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          disabled={saving || envForced}
          onClick={() => void toggle()}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
            active ? "bg-[#03045e]" : "bg-stone-200/90"
          } ${envForced ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              active ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <p className="mt-4 text-sm">
        Status:{" "}
        <span className={active ? "text-amber-700 font-medium" : "text-mocha"}>
          {active ? "Storefront offline" : "Storefront live"}
        </span>
      </p>

      {envForced ? (
        <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2">
          Forced on by the <code className="text-xs">MAINTENANCE_MODE</code>{" "}
          environment variable. Clear that env var and redeploy to use this toggle.
        </p>
      ) : null}

      {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </AdminCard>
  );
}
