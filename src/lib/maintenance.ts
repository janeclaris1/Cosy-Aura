import "server-only";

import { getStoreConfig } from "@/lib/store-config";

export function isMaintenanceEnvForced(): boolean {
  const value = process.env.MAINTENANCE_MODE?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

export type MaintenanceStatus = {
  enabled: boolean;
  /** Env override forces maintenance regardless of admin toggle. */
  envForced: boolean;
  /** Admin StoreConfig flag. */
  storeEnabled: boolean;
};

export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  const envForced = isMaintenanceEnvForced();
  let storeEnabled = false;
  try {
    const config = await getStoreConfig();
    storeEnabled = Boolean(config.maintenanceMode);
  } catch {
    storeEnabled = false;
  }
  return {
    enabled: envForced || storeEnabled,
    envForced,
    storeEnabled,
  };
}
