import { requireAdminPage } from "@/lib/admin";
import { PricingSettings } from "@/components/admin/PricingSettings";
import { WhatsAppCheckoutSettings } from "@/components/admin/WhatsAppCheckoutSettings";
import { MaintenanceModeSettings } from "@/components/admin/MaintenanceModeSettings";
import { ensureDefaultStoreConfig, getStoreConfig } from "@/lib/store-config";
import { isMaintenanceEnvForced } from "@/lib/maintenance";
import {
  AdminPageHeader,
  AdminSectionTitle,
  adminPageWrap,
} from "@/components/admin/admin-ui";

export default async function AdminPricingPage() {
  await requireAdminPage();
  await ensureDefaultStoreConfig();
  const config = await getStoreConfig();
  const envForced = isMaintenanceEnvForced();

  return (
    <div className={`${adminPageWrap} space-y-10`}>
      <AdminPageHeader
        eyebrow="Store"
        title="Store settings"
        description="Regional pricing, WhatsApp checkout, and storefront maintenance."
      />

      <section>
        <AdminSectionTitle
          title="Maintenance mode"
          description="Temporarily hide the storefront from customers."
        />
        <MaintenanceModeSettings
          initialEnabled={config.maintenanceMode}
          envForced={envForced}
        />
      </section>

      <section>
        <AdminSectionTitle
          title="Regional pricing"
          description="Markup rules for customers outside Africa."
        />
        <PricingSettings
          initialConfig={{
            nonAfricaMarkupEnabled: config.nonAfricaMarkupEnabled,
            nonAfricaMarkupUsd: config.nonAfricaMarkupUsd,
          }}
        />
      </section>

      <section>
        <AdminSectionTitle
          title="WhatsApp checkout"
          description="Numbers and messaging for manual order placement."
        />
        <WhatsAppCheckoutSettings initialConfig={config} />
      </section>
    </div>
  );
}
