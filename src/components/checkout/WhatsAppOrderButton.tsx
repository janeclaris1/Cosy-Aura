"use client";

import { useLocaleStore } from "@/lib/locale-store";
import {
  buildWhatsAppOrderMessage,
  PENDING_WHATSAPP_ORDER_KEY,
  type WhatsAppFulfillment,
} from "@/lib/store-config-client";
import { useWhatsAppCheckoutConfig } from "@/lib/whatsapp-checkout-client";
import { formatPrice, cn } from "@/lib/utils";

type Line = {
  brand?: string;
  model: string;
  quantity: number;
  sizeMl?: number;
  price: number;
};

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/**
 * Product-surface CTA: add to cart (via onPrepareCart) without leaving the page.
 * Checkout / WhatsApp submit happens from the cart when the shopper is ready.
 */
export function WhatsAppToCheckoutButton({
  onPrepareCart,
  className,
  label = "Order on WhatsApp",
  compact = false,
}: {
  onPrepareCart: () => void;
  className?: string;
  label?: string;
  compact?: boolean;
}) {
  const localeCountry = useLocaleStore((s) => s.country);
  const currency = useLocaleStore((s) => s.currency);
  const { cfg } = useWhatsAppCheckoutConfig({
    localeCountry,
    currency,
  });

  if (!cfg?.enabled) return null;

  function addToCart(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    onPrepareCart();
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={addToCart}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 w-full min-h-9 px-2 py-1.5 text-[11px] font-medium text-white bg-[#25D366] hover:bg-[#1ebe57] transition-colors",
          className
        )}
        aria-label={label}
      >
        <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
        WhatsApp
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={addToCart}
      className={cn(
        "inline-flex items-center justify-center gap-2 w-full min-h-11 px-4 py-3 text-sm font-medium text-white bg-[#25D366] hover:bg-[#1ebe57] transition-colors",
        className
      )}
    >
      <WhatsAppIcon className="w-5 h-5 shrink-0" />
      {label}
    </button>
  );
}

/** Opens WhatsApp with a prefilled message (checkout submit only). */
export function WhatsAppOrderButton({
  kind,
  lines,
  total,
  countryOverride,
  className,
  label = "Order on WhatsApp",
  withDivider = false,
  compact = false,
  customer,
  fulfillment,
  disabled = false,
  onDisabledClick,
  /** When set, Paystack (or other online pay) must complete before WhatsApp opens. */
  payBeforeWhatsApp = false,
  onPayBeforeWhatsApp,
  hint,
}: {
  kind: "cart" | "product";
  lines: Line[];
  total?: number;
  countryOverride?: string | null;
  className?: string;
  label?: string;
  withDivider?: boolean;
  compact?: boolean;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postcode?: string;
    region?: string;
  };
  fulfillment?: WhatsAppFulfillment;
  disabled?: boolean;
  onDisabledClick?: () => void;
  payBeforeWhatsApp?: boolean;
  onPayBeforeWhatsApp?: (whatsappHref: string) => void | Promise<void>;
  hint?: string;
}) {
  const localeCountry = useLocaleStore((s) => s.country);
  const currency = useLocaleStore((s) => s.currency);
  useLocaleStore((s) => s.rates);
  const { country, cfg } = useWhatsAppCheckoutConfig({
    override: countryOverride,
    localeCountry,
    currency,
  });

  if (!cfg?.enabled || !cfg.waMeUrl || !lines.length) return null;

  const message = buildWhatsAppOrderMessage({
    kind,
    country: cfg.country || country,
    lines: lines.map((line) => ({
      brand: line.brand,
      model: line.model,
      quantity: line.quantity,
      sizeMl: line.sizeMl,
      priceLabel: formatPrice(line.price, currency),
    })),
    totalLabel: total != null ? formatPrice(total, currency) : undefined,
    customer,
    fulfillment,
  });

  const href = `${cfg.waMeUrl}?text=${encodeURIComponent(message)}`;

  function handleClick(e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) {
    e.stopPropagation();
    if (disabled) {
      e.preventDefault();
      onDisabledClick?.();
      return;
    }
    if (payBeforeWhatsApp && onPayBeforeWhatsApp) {
      e.preventDefault();
      try {
        sessionStorage.setItem(PENDING_WHATSAPP_ORDER_KEY, href);
      } catch {
        /* ignore */
      }
      void onPayBeforeWhatsApp(href);
    }
  }

  const btnClass = cn(
    compact
      ? "inline-flex items-center justify-center gap-1.5 w-full min-h-9 px-2 py-1.5 text-[11px] font-medium text-white bg-[#25D366] hover:bg-[#1ebe57] transition-colors"
      : "inline-flex items-center justify-center gap-2 w-full min-h-11 px-4 py-3 text-sm font-medium text-white bg-[#25D366] hover:bg-[#1ebe57] transition-colors",
    disabled && "opacity-60 cursor-not-allowed hover:bg-[#25D366]",
    className
  );

  const icon = (
    <WhatsAppIcon className={compact ? "w-3.5 h-3.5 shrink-0" : "w-5 h-5 shrink-0"} />
  );
  const labelText = compact ? "WhatsApp" : label;

  const control =
    disabled || payBeforeWhatsApp ? (
      <button
        type="button"
        onClick={handleClick}
        className={btnClass}
        aria-label={label}
        disabled={false}
      >
        {icon}
        {labelText}
      </button>
    ) : (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={btnClass}
        aria-label={label}
      >
        {icon}
        {labelText}
      </a>
    );

  if (!withDivider) {
    return (
      <div>
        {control}
        {hint ? (
          <p className="mt-2 text-xs text-wf-gray text-center">{hint}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-wf-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider">
          <span className="bg-white px-3 text-wf-gray">or</span>
        </div>
      </div>
      {control}
      <p className="mt-2 text-xs text-wf-gray text-center">
        {hint ||
          (disabled
            ? "Fill in your checkout details first, then submit on WhatsApp."
            : payBeforeWhatsApp
              ? "Complete Paystack payment first — WhatsApp opens after payment succeeds."
              : "Opens WhatsApp with your order and checkout details for the local Cosy Aura number.")}
      </p>
    </div>
  );
}
