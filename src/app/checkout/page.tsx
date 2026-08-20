"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { useLocaleStore, useT } from "@/lib/locale-store";
import { formatPrice } from "@/lib/utils";
import { useCartDisplayPricing } from "@/lib/use-cart-display-pricing";
import { chargeCurrencyForDestination } from "@/lib/geo-locale";
import { StripeEmbeddedCheckout } from "@/components/checkout/StripeEmbeddedCheckout";
import { PaystackCheckoutForm } from "@/components/checkout/PaystackCheckoutForm";
import { FlutterwaveCheckoutForm } from "@/components/checkout/FlutterwaveCheckoutForm";
import { DeliveryDateSelect } from "@/components/checkout/DeliveryDateSelect";
import { earliestDeliveryIso } from "@/lib/delivery-dates";
import type { PaystackCountry } from "@/lib/paystack";
import { cemacCountryName, type CemacCountry } from "@/lib/flutterwave";
import type { GeoPaymentRoute, PaymentDestination } from "@/lib/geo-payment";
import { trackMetaInitiateCheckout } from "@/lib/meta-pixel";
import { isBottleSize } from "@/lib/bottle-sizes";
import { WhatsAppDetailsCheckout } from "@/components/checkout/WhatsAppDetailsCheckout";
function providerCopy(route: GeoPaymentRoute | null, destination: PaymentDestination | null) {
  if (destination === "GH" || destination === "NG") return "Paystack";
  if (destination === "CEMAC") return "Flutterwave";
  if (destination === "OTHER") return "Stripe";
  if (route?.provider === "paystack") return "Paystack";
  if (route?.provider === "flutterwave") return "Flutterwave";
  return "Stripe";
}

function detectBrowserCountry(timeoutMs = 4000): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        window.clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 10 * 60 * 1000 }
    );
  });
}

export default function CheckoutPage() {
  const { items, clearCart } = useCartStore();
  const { member, subtotal, bundleActive, bundlePercent, priceFor } =
    useCartDisplayPricing(items);
  const currency = useLocaleStore((s) => s.currency);
  const applyCheckoutRegion = useLocaleStore((s) => s.applyCheckoutRegion);
  useLocaleStore((s) => s.rates);
  const t = useT();
  const [viaWhatsApp, setViaWhatsApp] = useState(false);
  const [destination, setDestination] = useState<PaymentDestination | null>(null);
  const [cemacCountry, setCemacCountry] = useState<CemacCountry>("CM");
  const [route, setRoute] = useState<GeoPaymentRoute | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [detecting, setDetecting] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = useState(() => earliestDeliveryIso());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const checkoutTracked = useRef(false);
  const stripeRequestId = useRef(0);

  const cartKey = items.map((i) => `${i.fragranceId}:${i.quantity}:${i.price}`).join("|");

  useEffect(() => {
    setViaWhatsApp(
      new URLSearchParams(window.location.search).get("via") === "whatsapp"
    );
  }, []);

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
    (next: GeoPaymentRoute) => {
      setRoute(next);
      setDestination(next.destination);
      if (next.cemacCountry) setCemacCountry(next.cemacCountry);
      setShowPicker(false);
      setDetecting(false);

      const currencyCode = chargeCurrencyForDestination(next.destination);
      const countryCode =
        next.destination === "CEMAC"
          ? next.cemacCountry || next.country || "CM"
          : next.destination === "GH" || next.destination === "NG"
            ? next.destination
            : next.country && next.country !== "GH" && next.country !== "NG"
              ? next.country
              : null;

      applyCheckoutRegion({
        country: countryCode,
        currency: currencyCode,
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

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      setDetecting(true);
      try {
        const ipRes = await fetch("/api/geo");
        const ipData = (await ipRes.json()) as GeoPaymentRoute & { source?: string };
        if (cancelled) return;

        if (ipData.country) {
          applyRoute(ipData);
          return;
        }

        const coords = await detectBrowserCountry();
        if (cancelled) return;
        if (coords) {
          const gpsRes = await fetch(`/api/geo?lat=${coords.lat}&lng=${coords.lng}`);
          const gpsData = (await gpsRes.json()) as GeoPaymentRoute;
          if (cancelled) return;
          applyRoute(gpsData);
          return;
        }

        applyRoute(ipData);
      } catch {
        if (!cancelled) {
          applyRoute({
            country: null,
            destination: "OTHER",
            provider: "stripe",
            label: "location unknown",
          });
        }
      }
    }

    void detect();
    return () => {
      cancelled = true;
    };
  }, [applyRoute]);

  const startStripeCheckout = useCallback(async () => {
    if (items.length === 0) return;
    const date = deliveryDate || earliestDeliveryIso();
    const requestId = ++stripeRequestId.current;

    // Unmount any existing Embedded Checkout before creating a new session.
    setClientSecret(null);
    setLoading(true);
    setError(null);
    try {
      const country = useLocaleStore.getState().country;
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: paystackItems,
          deliveryDate: date,
          shopperCountry: country,
        }),
      });
      const data = await res.json();
      if (requestId !== stripeRequestId.current) return;
      if (!res.ok || !data.clientSecret) {
        throw new Error(data.error || "Could not start checkout");
      }
      setClientSecret(data.clientSecret);
    } catch (err) {
      if (requestId !== stripeRequestId.current) return;
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      if (requestId === stripeRequestId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, deliveryDate]);

  useEffect(() => {
    if (destination !== "OTHER" || showPicker) return;
    void startStripeCheckout();
  }, [destination, showPicker, startStripeCheckout]);

  function openPicker() {
    stripeRequestId.current += 1;
    setShowPicker(true);
    setClientSecret(null);
    setError(null);
  }

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
  const detectedLine =
    route?.country && route.label !== "location unknown"
      ? t("checkout.detected", {
          place: route.label,
          provider: providerCopy(route, destination),
        })
      : t("checkout.unknown");

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
              {t("checkout.detecting")}
            </p>
          )}

          {!detecting && (
            <>
              <p className="text-xs text-wf-gray mb-4">
                {detectedLine}{" "}
                <button
                  type="button"
                  onClick={openPicker}
                  className="underline hover:text-espresso"
                >
                  Change
                </button>
              </p>

              {showPicker && (
                <div className="space-y-3 mb-8">
                  <h1 className="font-playfair text-2xl text-espresso mb-4">
                    Choose payment region
                  </h1>
                  <button
                    type="button"
                    onClick={() =>
                      applyRoute({
                        country: "GH",
                        destination: "GH",
                        provider: "paystack",
                        label: "Ghana",
                      })
                    }
                    className="w-full text-left border border-wf-border px-4 py-3 hover:border-espresso transition-colors"
                  >
                    <span className="block text-sm font-medium">Ghana</span>
                    <span className="block text-xs text-wf-gray mt-0.5">
                      Paystack · cards &amp; mobile money
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyRoute({
                        country: "NG",
                        destination: "NG",
                        provider: "paystack",
                        label: "Nigeria",
                      })
                    }
                    className="w-full text-left border border-wf-border px-4 py-3 hover:border-espresso transition-colors"
                  >
                    <span className="block text-sm font-medium">Nigeria</span>
                    <span className="block text-xs text-wf-gray mt-0.5">
                      Paystack · cards, bank &amp; transfer
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyRoute({
                        country: "CM",
                        destination: "CEMAC",
                        cemacCountry: "CM",
                        provider: "flutterwave",
                        label: "Cameroon",
                      })
                    }
                    className="w-full text-left border border-wf-border px-4 py-3 hover:border-espresso transition-colors"
                  >
                    <span className="block text-sm font-medium">
                      CEMAC · Cameroon &amp; Central Africa
                    </span>
                    <span className="block text-xs text-wf-gray mt-0.5">
                      Flutterwave · cards &amp; mobile money (XAF)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyRoute({
                        country: null,
                        destination: "OTHER",
                        provider: "stripe",
                        label: "Rest of world",
                      })
                    }
                    className="w-full text-left border border-wf-border px-4 py-3 hover:border-espresso transition-colors"
                  >
                    <span className="block text-sm font-medium">Rest of world</span>
                    <span className="block text-xs text-wf-gray mt-0.5">
                      Stripe · Visa, Mastercard, Amex (USD)
                    </span>
                  </button>
                </div>
              )}

              {!showPicker && viaWhatsApp && (
                <p className="mb-6 text-sm text-espresso">
                  Complete your details below, then submit on WhatsApp so we can confirm your order.
                </p>
              )}

              {!showPicker && (destination === "GH" || destination === "NG") && (
                <PaystackCheckoutForm
                  country={destination as PaystackCountry}
                  items={paystackItems}
                  subtotal={subtotal}
                  onBack={openPicker}
                />
              )}

              {!showPicker && destination === "CEMAC" && (
                <FlutterwaveCheckoutForm
                  country={cemacCountry}
                  onCountryChange={(code) => {
                    setCemacCountry(code);
                    setRoute((prev) =>
                      prev
                        ? {
                            ...prev,
                            country: code,
                            cemacCountry: code,
                            label: cemacCountryName(code),
                          }
                        : prev
                    );
                    applyCheckoutRegion({ country: code, currency: "XAF" });
                  }}
                  items={paystackItems}
                  subtotal={subtotal}
                  onBack={openPicker}
                />
              )}

              {!showPicker && destination === "OTHER" && (
                <>
                  {viaWhatsApp ? (
                    <WhatsAppDetailsCheckout
                      lines={whatsappLines}
                      total={subtotal}
                      countryOverride={whatsappCountry}
                    />
                  ) : (
                    <>
                      <div className="mb-5">
                        <DeliveryDateSelect value={deliveryDate} onChange={setDeliveryDate} />
                      </div>
                      <p className="text-xs text-wf-gray mb-4">
                        You will be asked to accept our terms at the final payment step before
                        your order is submitted.
                      </p>
                      {loading && (
                        <p className="text-sm text-wf-gray py-20 text-center">
                          Loading secure checkout…
                        </p>
                      )}
                      {error && (
                        <div className="py-12 text-center space-y-4">
                          <p className="text-sm text-red-600">{error}</p>
                          <button
                            type="button"
                            className="btn-gold"
                            onClick={() => void startStripeCheckout()}
                          >
                            Try again
                          </button>
                          <button
                            type="button"
                            className="block mx-auto text-sm text-wf-gray"
                            onClick={() => clearCart()}
                          >
                            Clear cart
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
