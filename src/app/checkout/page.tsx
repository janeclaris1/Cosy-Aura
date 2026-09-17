"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { useLocaleStore, useT } from "@/lib/locale-store";
import { formatPrice } from "@/lib/utils";
import { useCartDisplayPricing } from "@/lib/use-cart-display-pricing";
import { chargeCurrencyForDestination, currencyForCountry } from "@/lib/geo-locale";
import { StripeEmbeddedCheckout } from "@/components/checkout/StripeEmbeddedCheckout";
import {
  InternationalAramexCheckout,
  type InternationalAramexCheckoutPayload,
} from "@/components/checkout/InternationalAramexCheckout";
import { PaystackCheckoutForm } from "@/components/checkout/PaystackCheckoutForm";
import { FlutterwaveCheckoutForm } from "@/components/checkout/FlutterwaveCheckoutForm";
import { DeliveryDateSelect } from "@/components/checkout/DeliveryDateSelect";
import { earliestDeliveryIso } from "@/lib/delivery-dates";
import type { PaystackCountry } from "@/lib/paystack";
import type { CemacCountry } from "@/lib/flutterwave";
import { paymentRouteFromCountry, type GeoPaymentRoute, type PaymentDestination } from "@/lib/geo-payment";
import { trackMetaInitiateCheckout } from "@/lib/meta-pixel";
import { isBottleSize } from "@/lib/bottle-sizes";
import { WhatsAppDetailsCheckout } from "@/components/checkout/WhatsAppDetailsCheckout";
import { CheckoutCountrySelect } from "@/components/checkout/CheckoutCountrySelect";

function cachedPaymentRoute(): GeoPaymentRoute {
  return paymentRouteFromCountry(useLocaleStore.getState().country);
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const { items, clearCart, addItem, updateQuantity } = useCartStore();
  const { member, subtotal, bundleActive, bundlePercent, priceFor } =
    useCartDisplayPricing(items);
  const currency = useLocaleStore((s) => s.currency);
  const localeCountry = useLocaleStore((s) => s.country);
  const applyCheckoutRegion = useLocaleStore((s) => s.applyCheckoutRegion);
  useLocaleStore((s) => s.rates);
  const t = useT();
  const [viaWhatsApp, setViaWhatsApp] = useState(false);
  const initialRoute = cachedPaymentRoute();
  const [destination, setDestination] = useState<PaymentDestination | null>(
    () => initialRoute.destination
  );
  const [cemacCountry, setCemacCountry] = useState<CemacCountry>(
    () => initialRoute.cemacCountry || "CM"
  );
  const [route, setRoute] = useState<GeoPaymentRoute | null>(() => initialRoute);
  const [detecting, setDetecting] = useState(() => !useLocaleStore.getState().country);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [aramexReady, setAramexReady] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(() => earliestDeliveryIso());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const checkoutTracked = useRef(false);
  const stripeRequestId = useRef(0);
  const userSelectedCountryRef = useRef<string | null>(null);
  const recoveryLoaded = useRef(false);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);

  const cartKey = items.map((i) => `${i.fragranceId}:${i.quantity}:${i.price}`).join("|");

  useEffect(() => {
    setViaWhatsApp(
      new URLSearchParams(window.location.search).get("via") === "whatsapp"
    );
  }, []);

  useEffect(() => {
    const token = searchParams.get("recover")?.trim();
    if (!token || recoveryLoaded.current) return;
    recoveryLoaded.current = true;

    void (async () => {
      try {
        const res = await fetch(
          `/api/checkout/recover?token=${encodeURIComponent(token)}`
        );
        const data = (await res.json()) as {
          error?: string;
          items?: Array<{
            fragranceId: string;
            slug: string;
            brand: string;
            model: string;
            price: number;
            quantity: number;
            bottleSize?: number;
            image: string;
          }>;
        };
        if (!res.ok || !data.items?.length) {
          setRecoveryNotice(data.error || "Could not restore your cart.");
          return;
        }

        clearCart();
        for (const line of data.items) {
          addItem({
            fragranceId: line.fragranceId,
            slug: line.slug,
            brand: line.brand,
            model: line.model,
            price: line.price,
            image: line.image,
            bottleSize: line.bottleSize,
          });
          if (line.quantity > 1) {
            updateQuantity(line.fragranceId, line.quantity, line.bottleSize);
          }
        }
        setRecoveryNotice("Your cart has been restored. Complete checkout below.");
      } catch {
        setRecoveryNotice("Could not restore your cart.");
      }
    })();
  }, [searchParams, clearCart, addItem, updateQuantity]);

  useEffect(() => {
    if (!items.length || checkoutTracked.current) return;
    checkoutTracked.current = true;
    trackMetaInitiateCheckout({
      value: subtotal,
      currency,
      numItems: items.reduce((sum, i) => sum + i.quantity, 0),
      contents: items.map((i) => ({
        id: i.fragranceId,
        quantity: i.quantity,
        item_price: i.price,
      })),
    });
  }, [items, subtotal, currency]);

  const paystackItems = items.map((i) => ({
    fragranceId: i.fragranceId,
    quantity: i.quantity,
    price: i.price,
    bottleSize: i.bottleSize,
    brand: i.brand,
    model: i.model,
  }));

  const applyRoute = useCallback(
    (next: GeoPaymentRoute, opts?: { userSelected?: boolean }) => {
      setRoute(next);
      setDestination(next.destination);
      if (next.cemacCountry) setCemacCountry(next.cemacCountry);
      setDetecting(false);

      const countryCode =
        next.destination === "CEMAC"
          ? next.cemacCountry || next.country || "CM"
          : next.destination === "GH" || next.destination === "NG"
            ? next.destination
            : next.country && next.country !== "GH" && next.country !== "NG"
              ? next.country
              : null;

      const store = useLocaleStore.getState();
      const currencyCode = countryCode
        ? currencyForCountry(countryCode)
        : chargeCurrencyForDestination(next.destination);

      // Keep shop display currency when entering checkout — only change when user picks a country.
      const keepShopCurrency =
        !opts?.userSelected &&
        store.country &&
        countryCode &&
        store.country === countryCode &&
        store.currency;

      applyCheckoutRegion({
        country: countryCode,
        currency: keepShopCurrency ? store.currency : currencyCode,
      });
    },
    [applyCheckoutRegion]
  );

  // WhatsApp shoppers on GHS should land on Ghana Paystack checkout (details form).
  useEffect(() => {
    if (!viaWhatsApp || detecting || destination !== "OTHER") return;
    if (currency !== "GHS") return;
    applyRoute({
      country: "GH",
      destination: "GH",
      provider: "paystack",
      label: "Ghana",
    });
  }, [viaWhatsApp, detecting, destination, currency, applyRoute]);

  // Sync payment route from shop geo — never replace with IP once a country is known.
  useEffect(() => {
    if (!localeCountry || userSelectedCountryRef.current) return;
    applyRoute(paymentRouteFromCountry(localeCountry));
  }, [localeCountry, applyRoute]);

  // Only call /api/geo when the shop never resolved a country (first visit / localhost).
  useEffect(() => {
    if (localeCountry) {
      setDetecting(false);
      return;
    }

    let cancelled = false;

    async function detectWhenUnknown() {
      try {
        const ipRes = await fetch("/api/geo");
        const ipData = (await ipRes.json()) as GeoPaymentRoute;
        if (cancelled || userSelectedCountryRef.current) return;
        if (useLocaleStore.getState().country) return;
        applyRoute(ipData);
      } catch {
        if (!cancelled && !useLocaleStore.getState().country && !userSelectedCountryRef.current) {
          applyRoute(paymentRouteFromCountry(null));
        }
      }
    }

    void detectWhenUnknown();
    return () => {
      cancelled = true;
    };
  }, [localeCountry, applyRoute]);

  const startStripeCheckout = useCallback(async (aramex: InternationalAramexCheckoutPayload) => {
    if (items.length === 0) return;
    const date = deliveryDate || earliestDeliveryIso();
    const requestId = ++stripeRequestId.current;

    // Unmount any existing Embedded Checkout before creating a new session.
    setClientSecret(null);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: paystackItems,
          deliveryDate: date,
          shopperCountry: aramex.shopperCountry,
          email: aramex.email,
          name: aramex.name,
          phone: aramex.phone,
          address: aramex.address,
          city: aramex.city,
          postcode: aramex.postcode,
          shippingRateId: aramex.shippingRateId,
          shippingPriceUsd: aramex.shippingPriceUsd,
        }),
      });
      const data = await res.json();
      if (requestId !== stripeRequestId.current) return;
      if (!res.ok || !data.clientSecret) {
        throw new Error(data.error || "Could not start checkout");
      }
      setAramexReady(true);
      setClientSecret(data.clientSecret);
    } catch (err) {
      if (requestId !== stripeRequestId.current) return;
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      if (requestId === stripeRequestId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, deliveryDate]);

  if (items.length === 0 && !clientSecret) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="font-playfair text-3xl mb-4">Checkout</h1>
        <p className="text-wf-gray mb-8">Your cart is empty.</p>
        <Link href="/fragrances" className="btn-gold">
          Continue Shopping
        </Link>
      </div>
    );
  }

  const chargeCurrency = chargeCurrencyForDestination(destination);
  const whatsappCountry =
    destination === "GH" || destination === "NG"
      ? destination
      : destination === "CEMAC"
        ? cemacCountry
        : route?.country || null;
  const whatsappLines = items.map((i) => ({
    brand: i.brand,
    model: i.model,
    quantity: i.quantity,
    sizeMl: isBottleSize(Number(i.bottleSize)) ? Number(i.bottleSize) : undefined,
    price: priceFor(i),
  }));

  return (
    <div className="min-h-[calc(100vh-8rem)] grid grid-cols-1 lg:grid-cols-2">
      <aside className="bg-[#0a2540] text-white order-2 lg:order-1">
        <div className="max-w-lg mx-auto lg:ml-auto lg:mr-0 px-6 py-8 lg:py-12 lg:pr-12 lg:pl-8">
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            COSY AURA
          </Link>

          <p className="text-sm text-white/60 mb-1">{t("checkout.pay")}</p>
          <p className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">
            {formatPrice(subtotal, currency)}
            <span className="block text-sm font-normal text-white/50 mt-1">
              {t("checkout.shippingExtra")}
            </span>
          </p>
          {member.active || bundleActive ? (
            <p className="text-xs text-amber-200/90 mb-8">
              {[
                member.active
                  ? `Member ${member.percent}% discount applied`
                  : null,
                bundleActive
                  ? `Sample bundle ${bundlePercent}% off`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : (
            <p className="text-xs text-white/55 mb-8">
              <Link href="/account/register" className="underline hover:text-white">
                Create an account
              </Link>{" "}
              for a permanent {member.percent}% member discount.
            </p>
          )}

          <ul className="space-y-5">
            {items.map((item) => (
              <li
                key={`${item.fragranceId}-${item.bottleSize ?? "std"}`}
                className="flex gap-4"
              >
                <div className="relative w-16 h-16 rounded-md overflow-hidden bg-accent shrink-0">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={`${item.brand} ${item.model}`}
                      fill
                      className="object-contain"
                      sizes="64px"
                    />
                  ) : null}
                  {item.quantity > 1 && (
                    <span className="absolute -top-1 -right-1 bg-white text-[#0a2540] text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {item.quantity}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.brand} {item.model}
                  </p>
                  <p className="text-xs text-white/50 mt-0.5">
                    {t("checkout.qty", { n: item.quantity })}
                  </p>
                </div>
                <p className="text-sm font-medium shrink-0">
                  {formatPrice(priceFor(item) * item.quantity, currency)}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-8 pt-6 border-t border-white/15 space-y-2 text-sm">
            <div className="flex justify-between text-white/70">
              <span>{t("checkout.subtotal")}</span>
              <span>{formatPrice(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>{t("checkout.shipping")}</span>
              <span>{t("checkout.shippingCalc")}</span>
            </div>
            <div className="flex justify-between text-base font-semibold pt-2">
              <span>{t("checkout.totalDue")}</span>
              <span>{formatPrice(subtotal, currency)}+</span>
            </div>
            {currency !== chargeCurrency ? (
              <p className="text-xs text-white/50 pt-2">
                {t("checkout.displayNote", {
                  display: currency,
                  charge: chargeCurrency,
                })}
              </p>
            ) : null}
          </div>
        </div>
      </aside>

      <section className="bg-white order-1 lg:order-2">
        <div className="max-w-lg mx-auto lg:mr-auto lg:ml-0 px-4 sm:px-6 py-8 lg:py-12 lg:pl-12 lg:pr-8">
          {detecting && (
            <p className="text-sm text-wf-gray py-20 text-center">
              {t("checkout.loading")}
            </p>
          )}

          {!detecting && (
            <>
              {recoveryNotice ? (
                <p className="mb-4 rounded-lg border border-[#FFD200]/45 bg-[#FFD200]/12 px-3.5 py-2.5 text-sm text-espresso">
                  {recoveryNotice}
                </p>
              ) : null}
              <div className="mb-5">
                <CheckoutCountrySelect
                  value={route?.country || localeCountry || "US"}
                  label={t("checkout.country")}
                  onChange={(code) => {
                    userSelectedCountryRef.current = code;
                    applyRoute(paymentRouteFromCountry(code), { userSelected: true });
                  }}
                />
              </div>

              {(destination === "GH" || destination === "NG") && (
                <PaystackCheckoutForm
                  country={destination as PaystackCountry}
                  items={paystackItems}
                  subtotal={subtotal}
                />
              )}

              {destination === "CEMAC" && (
                <FlutterwaveCheckoutForm
                  country={cemacCountry}
                  items={paystackItems}
                  subtotal={subtotal}
                />
              )}

              {destination === "OTHER" && (
                <>
                  {viaWhatsApp ? (
                    <WhatsAppDetailsCheckout
                      lines={whatsappLines}
                      total={subtotal}
                      countryOverride={whatsappCountry}
                    />
                  ) : !aramexReady || !clientSecret ? (
                    <>
                      <div className="mb-5">
                        <DeliveryDateSelect value={deliveryDate} onChange={setDeliveryDate} />
                      </div>
                      <InternationalAramexCheckout
                        shopperCountry={route?.country || "US"}
                        items={paystackItems}
                        subtotalGhs={subtotal}
                        loading={loading}
                        error={error}
                        onContinue={(payload) => void startStripeCheckout(payload)}
                      />
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-wf-gray mb-4">
                        Aramex shipping confirmed. Complete payment below — you will be asked to
                        accept our terms before your order is submitted.
                      </p>
                      {loading && (
                        <p className="text-sm text-wf-gray py-8 text-center">
                          Loading secure checkout…
                        </p>
                      )}
                      {error && (
                        <div className="py-8 text-center space-y-4">
                          <p className="text-sm text-red-600">{error}</p>
                          <button
                            type="button"
                            className="btn-gold"
                            onClick={() => {
                              setAramexReady(false);
                              setClientSecret(null);
                            }}
                          >
                            Back to shipping
                          </button>
                        </div>
                      )}
                      {!loading && !error && clientSecret && (
                        <StripeEmbeddedCheckout
                          key={clientSecret}
                          clientSecret={clientSecret}
                        />
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
