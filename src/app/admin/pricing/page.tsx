import { requireAdminPage } from "@/lib/admin-page";
import { CatalogMarkupSettings } from "@/components/admin/CatalogMarkupSettings";
import { PricingSettings } from "@/components/admin/PricingSettings";
import { WhatsAppCheckoutSettings } from "@/components/admin/WhatsAppCheckoutSettings";
import { GuestPriceVisibilitySettings } from "@/components/admin/GuestPriceVisibilitySettings";
import { MaintenanceModeSettings } from "@/components/admin/MaintenanceModeSettings";
import { ensureDefaultStoreConfig, getStoreConfig } from "@/lib/store-config";
import { isMaintenanceEnvForced } from "@/lib/maintenance";
import {
  AdminPageHeader,
  AdminSectionTitle,
  adminPageWrap,
} from "@/components/admin/admin-ui";

export default async function AdminPricingPage() {
  await requireAdminPage("settings.write");
  try {
    await ensureDefaultStoreConfig();
  } catch (error) {
    console.error("[store-config] ensureDefaultStoreConfig failed", error);
  }
  const config = await getStoreConfig();
  const envForced = isMaintenanceEnvForced();

  return (
    <div className={`${adminPageWrap} space-y-10`}>
      <AdminPageHeader
        eyebrow="Store"
        title="Store settings"
        description="Regional pricing, guest price visibility, WhatsApp checkout, and storefront maintenance."
      />

      <section>
        <AdminSectionTitle
          title="Guest price visibility"
          description="Hide non-perfume catalog prices from visitors who are not signed in."
        />
        <GuestPriceVisibilitySettings initialHidden={config.guestHiddenPriceCatalogs} />
      </section>

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
        <div className="mt-8">
          <CatalogMarkupSettings
            initialMarkups={config.catalogMarkupUsd}
            globalMarkupUsd={config.nonAfricaMarkupUsd}
          />
        </div>
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
