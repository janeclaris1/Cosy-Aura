import { requireAdminPage } from "@/lib/admin";
import { PricingSettings } from "@/components/admin/PricingSettings";
import { WhatsAppCheckoutSettings } from "@/components/admin/WhatsAppCheckoutSettings";
import { ensureDefaultStoreConfig, getStoreConfig } from "@/lib/store-config";

export default async function AdminPricingPage() {
  await requireAdminPage();
  await ensureDefaultStoreConfig();
  const config = await getStoreConfig();

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-playfair text-3xl mb-2">Store settings</h1>
        <p className="text-sm text-wf-gray mb-8">
          Regional pricing and WhatsApp checkout for shoppers by country.
        </p>
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
