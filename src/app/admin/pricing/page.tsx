import { requireAdminPage } from "@/lib/admin";
import { PricingSettings } from "@/components/admin/PricingSettings";
import { WhatsAppCheckoutSettings } from "@/components/admin/WhatsAppCheckoutSettings";
import { MaintenanceModeSettings } from "@/components/admin/MaintenanceModeSettings";
import { ensureDefaultStoreConfig, getStoreConfig } from "@/lib/store-config";
import { isMaintenanceEnvForced } from "@/lib/maintenance";

export default async function AdminPricingPage() {
  await requireAdminPage();
  await ensureDefaultStoreConfig();
  const config = await getStoreConfig();
  const envForced = isMaintenanceEnvForced();

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-playfair text-3xl mb-2">Store settings</h1>
        <p className="text-sm text-wf-gray mb-8">
          Regional pricing, WhatsApp checkout, and storefront maintenance.
        </p>
        <div className="mb-10">
          <MaintenanceModeSettings
            initialEnabled={config.maintenanceMode}
            envForced={envForced}
          />
        </div>
        <PricingSettings
          initialConfig={{
            nonAfricaMarkupEnabled: config.nonAfricaMarkupEnabled,
            nonAfricaMarkupUsd: config.nonAfricaMarkupUsd,
          }}
        />
      </div>
      <WhatsAppCheckoutSettings initialConfig={config} />
    </div>
  );
}
