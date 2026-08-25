import "server-only";

import { prisma } from "@/lib/prisma";
import { isMaintenanceBypassPath } from "@/lib/maintenance-paths";

export { isMaintenanceBypassPath };

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

/**
 * Always reads the DB flag fresh (no StoreConfig TTL cache) so admin toggles
 * apply on the next request.
 */
export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  const envForced = isMaintenanceEnvForced();
  let storeEnabled = false;
  try {
    const row = await prisma.storeConfig.findUnique({
      where: { id: "default" },
      select: { maintenanceMode: true },
    });
    storeEnabled = Boolean(row?.maintenanceMode);
  } catch {
    storeEnabled = false;
  }
  return {
    enabled: envForced || storeEnabled,
    envForced,
    storeEnabled,
  };
}
