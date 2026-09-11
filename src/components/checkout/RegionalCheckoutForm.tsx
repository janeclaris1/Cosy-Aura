"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";
import { useLocaleStore, useT } from "@/lib/locale-store";
import { shippingUsdToGhs } from "@/lib/fx";
import { earliestDeliveryIso, formatDeliveryDateLabel } from "@/lib/delivery-dates";
import { isBottleSize } from "@/lib/bottle-sizes";
import { DeliveryDateSelect } from "@/components/checkout/DeliveryDateSelect";
import { WhatsAppOrderButton } from "@/components/checkout/WhatsAppOrderButton";
import { useWhatsAppCheckoutConfig } from "@/lib/whatsapp-checkout-client";
import type { WhatsAppFulfillment } from "@/lib/store-config-client";
import { PENDING_WHATSAPP_ORDER_KEY } from "@/lib/store-config-client";

type Method = {
  id: string;
  name: string;
  eta: string;
  price: number;
  description?: string | null;
};

export type RegionalCartItem = {
  fragranceId: string;
  quantity: number;
  price: number;
  bottleSize?: number;
  brand?: string;
  model?: string;
};

type GhanaRegion = { id: number; name: string };

type GhanaDeliveryConfig = {
  enabled: boolean;
  partnerPayerEnabled: boolean;
  nextDayOnly: boolean;
  regions: GhanaRegion[];
  defaultRegion: string;
  codEnabled?: boolean;
  pickupEnabled?: boolean;
  pickup?: {
    branchName: string | null;
    address: string | null;
    city: string | null;
    phone: string | null;
    openingHours: string | null;
    notes: string | null;
  } | null;
  providers?: {
    dawurobo?: {
      available: boolean;
      name: string;
      coverage: string;
      pricing: string;
      description: string;
    };
    shaqexpress?: {
      available: boolean;
      requiresApi?: boolean;
      name: string;
      coverage: string;
      pricing: string;
      description: string;
    };
  };
  deliveryFees?: {
    accraGhs: number;
    outsideAccraGhs: number;
  };
  freeDeliveryThresholdGhs?: number;
};

type CourierChoice = "dawurobo" | "shaqexpress" | "pickup";

type DeliveryPayer = "partner" | "recipient" | "cod";

type DeliveryEstimate = {
  provider: "dawurobo" | "shaqexpress";
  amountGhs: number;
  label: string;
  liveRate?: boolean;
};

export function RegionalCheckoutForm({
  country,
  onCountryChange,
  countryOptions,
  items,
  subtotal,
  onBack,
  endpoint,
  providerLabel,
  hint,
  phonePlaceholder,
  submitLabel,
}: {
  country: string;
  onCountryChange?: (code: string) => void;
  countryOptions?: ReadonlyArray<{ code: string; name: string }>;
  items: RegionalCartItem[];
  subtotal: number;
  onBack?: () => void;
  endpoint: string;
  providerLabel: string;
  hint: string;
  phonePlaceholder: string;
  submitLabel: string;
}) {
  const currency = useLocaleStore((s) => s.currency);
  const rates = useLocaleStore((s) => s.rates);
  const t = useT();
  const { cfg: whatsappCfg } = useWhatsAppCheckoutConfig({
    override: country,
    currency,
  });
  const whatsappEnabled = Boolean(whatsappCfg?.enabled && whatsappCfg.waMeUrl);
  const [methods, setMethods] = useState<Method[]>([]);
  const [shippingId, setShippingId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(() => earliestDeliveryIso());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ghanaDelivery, setGhanaDelivery] = useState<GhanaDeliveryConfig | null>(null);
  const [destinationRegion, setDestinationRegion] = useState("Greater Accra");
  const [regionId, setRegionId] = useState<number | null>(null);
  const [courierChoice, setCourierChoice] = useState<CourierChoice | null>(null);
  const [deliveryPayer, setDeliveryPayer] = useState<DeliveryPayer>("recipient");
  const [estimate, setEstimate] = useState<DeliveryEstimate | null>(null);
  const [dawuroboQuoteGhs, setDawuroboQuoteGhs] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [form, setForm] = useState({
    email: "",
    name: "",
    phone: "",
    address: "",
    city: "",
    postcode: "",
  });

  const useGhanaCourier = country === "GH" && Boolean(ghanaDelivery?.enabled);
  const ghanaSplitPayment = useGhanaCourier;
  const shipping = methods.find((method) => method.id === shippingId) || methods[0];
  const flatShippingGhs = shippingUsdToGhs(shipping?.price || 0, rates);
  const isAccraRegion = /greater\s*accra/i.test(destinationRegion);
  const dawuroboOk = Boolean(ghanaDelivery?.providers?.dawurobo?.available) && isAccraRegion;
  // ShaQ Express: Accra (alongside Dawurobo) and all other Ghana regions
  const shaqOk = Boolean(ghanaDelivery?.providers?.shaqexpress?.available);
  const codEnabled = ghanaDelivery?.codEnabled !== false;
  const pickupInfo = ghanaDelivery?.pickupEnabled ? ghanaDelivery.pickup : null;
  const pickupOk = Boolean(ghanaDelivery?.pickupEnabled);
  const regionDeliveryFeeGhs =
    ghanaDelivery?.deliveryFees != null
      ? isAccraRegion
        ? ghanaDelivery.deliveryFees.accraGhs
        : ghanaDelivery.deliveryFees.outsideAccraGhs
      : isAccraRegion
        ? 63
        : 84;
  const shaqFeeGhs = regionDeliveryFeeGhs;
  const activeCourier: CourierChoice | null =
    courierChoice === "pickup" && pickupOk
      ? "pickup"
      : courierChoice &&
          ((courierChoice === "dawurobo" && dawuroboOk) ||
            (courierChoice === "shaqexpress" && shaqOk))
        ? courierChoice
        : !isAccraRegion && shaqOk
          ? "shaqexpress"
          : dawuroboOk
            ? "dawurobo"
            : shaqOk
              ? "shaqexpress"
              : pickupOk
                ? "pickup"
                : null;
  const estimateGhs =
    activeCourier === "dawurobo" || activeCourier === "shaqexpress"
      ? estimate?.provider === activeCourier
        ? (estimate.amountGhs ?? null)
        : null
      : null;
  /** Prepaid delivery: Dawurobo live rate when chosen; ShaQ flat fee otherwise. */
  const rawPrepaidDeliveryGhs =
    activeCourier === "pickup"
      ? 0
      : activeCourier === "dawurobo"
        ? estimateGhs != null
          ? estimateGhs
          : dawuroboQuoteGhs != null
            ? dawuroboQuoteGhs
            : 0
        : activeCourier === "shaqexpress"
          ? estimateGhs != null
            ? estimateGhs
            : shaqFeeGhs
          : 0;
  const freeDeliveryThresholdGhs = ghanaDelivery?.freeDeliveryThresholdGhs ?? 1000;
  const ghanaFreeDelivery =
    useGhanaCourier &&
    activeCourier !== "pickup" &&
    subtotal >= freeDeliveryThresholdGhs;
  const prepaidDeliveryGhs = ghanaFreeDelivery ? 0 : rawPrepaidDeliveryGhs;
  const shippingGhs = useGhanaCourier
    ? deliveryPayer === "recipient"
      ? 0
      : prepaidDeliveryGhs
    : flatShippingGhs;
  const total =
    useGhanaCourier && deliveryPayer === "cod" ? prepaidDeliveryGhs : subtotal + shippingGhs;
  const dawuroboDisplayGhs =
    activeCourier === "dawurobo" && estimateGhs != null
      ? estimateGhs
      : dawuroboQuoteGhs;

  const orderTotalGhs = useGhanaCourier
    ? subtotal + prepaidDeliveryGhs
    : subtotal + flatShippingGhs;
  const payNowGhs = total;
  const balanceOnDeliveryGhs = useGhanaCourier
    ? deliveryPayer === "recipient"
      ? prepaidDeliveryGhs
      : deliveryPayer === "cod"
        ? subtotal
        : 0
    : 0;
  const courierLabel = useGhanaCourier
    ? activeCourier === "dawurobo"
      ? "Dawurobo"
      : activeCourier === "shaqexpress"
        ? "ShaQ Express"
        : activeCourier === "pickup"
          ? t("checkout.pickup")
          : undefined
    : shipping?.name;
  const paymentMethodLabel = ghanaSplitPayment
    ? deliveryPayer === "recipient"
      ? t("checkout.payOrderNow")
      : deliveryPayer === "cod"
        ? t("checkout.cashOnDelivery")
        : t("checkout.payInFull")
    : t("checkout.payInFull");
  /** Always collect Paystack (order and/or delivery fee) before WhatsApp opens. */
  const payBeforeWhatsApp = Boolean(whatsappEnabled);
  const whatsappFulfillment: WhatsAppFulfillment = {
    courier: courierLabel,
    deliveryFeeLabel: useGhanaCourier
      ? ghanaFreeDelivery
        ? t("checkout.freeDelivery")
        : prepaidDeliveryGhs > 0
          ? formatPrice(prepaidDeliveryGhs, currency)
          : estimating
            ? "Confirming…"
            : undefined
      : flatShippingGhs > 0
        ? formatPrice(flatShippingGhs, currency)
        : undefined,
    deliveryDateLabel: deliveryDate
      ? formatDeliveryDateLabel(deliveryDate)
      : undefined,
    paymentMethod: paymentMethodLabel,
    paymentStatus:
      ghanaSplitPayment && deliveryPayer === "cod"
        ? "Delivery fee paid via Paystack"
        : "Paid via Paystack",
    orderTotalLabel: formatPrice(orderTotalGhs, currency),
    payNowLabel: formatPrice(payNowGhs, currency),
    balanceOnDeliveryLabel: ghanaSplitPayment
      ? balanceOnDeliveryGhs > 0
        ? deliveryPayer === "recipient"
          ? `${formatPrice(balanceOnDeliveryGhs, currency)} (delivery fee)`
          : `${formatPrice(balanceOnDeliveryGhs, currency)} (order)`
        : "None"
      : "None",
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/shipping/methods");
        const data = await res.json();
        if (cancelled) return;
        const list = (data.methods || []) as Method[];
        setMethods(list);
        const defaultMethod =
          list.find((m) => !/pickup/i.test(m.name)) || list[0];
        if (defaultMethod) setShippingId(defaultMethod.id);
      } catch {
        if (!cancelled) setError("Could not load shipping options");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (country !== "GH") {
      setGhanaDelivery(null);
      setCourierChoice(null);
      setDeliveryPayer("partner");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/checkout/ghana/config");
        const data = (await res.json()) as GhanaDeliveryConfig;
        if (cancelled) return;
        setGhanaDelivery(data);
        const defaultRegion =
          data.regions.find((r) => r.name === data.defaultRegion)?.name ||
          data.regions[0]?.name ||
          "Greater Accra";
        const defaultId =
          data.regions.find((r) => r.name === defaultRegion)?.id ?? data.regions[0]?.id ?? null;
        setDestinationRegion(defaultRegion);
        setRegionId(defaultId);
        if (!data.partnerPayerEnabled) setDeliveryPayer("recipient");
        setDeliveryDate(earliestDeliveryIso());
        // Prefer Dawurobo in Accra when available
        if (data.providers?.dawurobo?.available && /greater\s*accra/i.test(defaultRegion)) {
          setCourierChoice("dawurobo");
        } else if (data.providers?.shaqexpress?.available) {
          setCourierChoice("shaqexpress");
        } else {
          setCourierChoice(null);
        }
      } catch {
        if (!cancelled) {
          setGhanaDelivery({
            enabled: false,
            partnerPayerEnabled: false,
            nextDayOnly: true,
            regions: [],
            defaultRegion: "Greater Accra",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [country]);

  // Keep courier choice valid when region changes (Dawurobo = Accra only)
  useEffect(() => {
    if (!useGhanaCourier) return;
    if (courierChoice === "pickup") {
      if (!pickupOk) setCourierChoice(shaqOk ? "shaqexpress" : dawuroboOk ? "dawurobo" : null);
      return;
    }
    if (courierChoice === "dawurobo" && !dawuroboOk) {
      setCourierChoice(shaqOk ? "shaqexpress" : pickupOk ? "pickup" : null);
      return;
    }
    if (!isAccraRegion && shaqOk && courierChoice !== "shaqexpress") {
      setCourierChoice("shaqexpress");
      return;
    }
    if (!courierChoice) {
      if (!isAccraRegion && shaqOk) setCourierChoice("shaqexpress");
      else if (dawuroboOk) setCourierChoice("dawurobo");
      else if (shaqOk) setCourierChoice("shaqexpress");
      else if (pickupOk) setCourierChoice("pickup");
    }
  }, [useGhanaCourier, dawuroboOk, shaqOk, pickupOk, courierChoice, isAccraRegion]);

  useEffect(() => {
    if (!codEnabled && deliveryPayer === "cod") {
      setDeliveryPayer("recipient");
    }
  }, [codEnabled, deliveryPayer]);

  useEffect(() => {
    if (activeCourier === "pickup" && deliveryPayer === "cod") {
      setDeliveryPayer("partner");
    }
  }, [activeCourier, deliveryPayer]);

  useEffect(() => {
    if (!useGhanaCourier || !destinationRegion.trim() || !activeCourier || activeCourier === "pickup") {
      setEstimate(null);
      if (!dawuroboOk || activeCourier === "pickup") setDawuroboQuoteGhs(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setEstimating(true);
      try {
        const city = form.city || destinationRegion;
        const payloadBase = {
          region: destinationRegion,
          city,
          address: form.address,
        };

        // When Accra has both agencies, always refresh Dawurobo live rate for comparison.
        const jobs: Promise<Response>[] = [
          fetch("/api/checkout/ghana/estimate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payloadBase, provider: activeCourier }),
          }),
        ];
        if (dawuroboOk && activeCourier !== "dawurobo") {
          jobs.push(
            fetch("/api/checkout/ghana/estimate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...payloadBase, provider: "dawurobo" }),
            })
          );
        }

        const [primaryRes, dawuroboRes] = await Promise.all(jobs);
        const primary = await primaryRes.json();
        if (cancelled) return;

        if (!primaryRes.ok) {
          setEstimate(null);
          setError(primary.error || "Could not estimate delivery");
          return;
        }

        setError(null);
        setEstimate({
          provider: primary.provider,
          amountGhs: Number(primary.amountGhs) || 0,
          label: primary.label || "",
          liveRate: Boolean(primary.liveRate),
        });

        if (primary.provider === "dawurobo") {
          setDawuroboQuoteGhs(Number(primary.amountGhs) || 0);
        } else if (dawuroboRes) {
          const daw = await dawuroboRes.json();
          if (dawuroboRes.ok && Number.isFinite(Number(daw.amountGhs))) {
            setDawuroboQuoteGhs(Number(daw.amountGhs));
          }
        }
      } catch {
        if (!cancelled) {
          setEstimate(null);
          setError("Could not estimate delivery");
        }
      } finally {
        if (!cancelled) setEstimating(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [useGhanaCourier, destinationRegion, form.city, form.address, activeCourier, dawuroboOk]);

  async function startOnlineCheckout() {
    setLoading(true);
    setError(null);
    try {
      if (useGhanaCourier && !activeCourier) {
        throw new Error("Select a delivery agency.");
      }
      if (
        useGhanaCourier &&
        activeCourier !== "pickup" &&
        (deliveryPayer === "partner" || deliveryPayer === "cod") &&
        prepaidDeliveryGhs <= 0 &&
        !ghanaFreeDelivery
      ) {
        throw new Error(
          activeCourier === "dawurobo"
            ? "Enter your address so we can calculate the live delivery rate."
            : "Select your region to calculate the delivery fee."
        );
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country,
          ...form,
          shippingMethodId: shippingId,
          deliveryDate,
          items,
          ...(ghanaSplitPayment
            ? {
                deliveryPayer: activeCourier === "pickup" ? "partner" : deliveryPayer,
                destinationRegion,
                regionId,
                deliveryProvider: activeCourier,
              }
            : {}),
        }),
      });

      const raw = await res.text();
      let data: { error?: string; authorizationUrl?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(
          res.ok
            ? `${providerLabel} returned an invalid response. Please refresh and try again.`
            : `Checkout unavailable (${res.status}). Please refresh the page and try again.`
        );
      }

      if (!res.ok || !data.authorizationUrl) {
        throw new Error(data.error || `Could not start ${providerLabel}`);
      }
      window.location.href = data.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      sessionStorage.removeItem(PENDING_WHATSAPP_ORDER_KEY);
    } catch {
      /* ignore */
    }
    await startOnlineCheckout();
  }

  async function handleWhatsAppPayFirst() {
    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.address.trim()
    ) {
      setError(t("checkout.whatsappNeedDetails"));
      return;
    }
    await startOnlineCheckout();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="text-xs uppercase tracking-[0.14em] text-mocha hover:text-highlight"
        >
          {t("form.changeCountry")}
        </button>
      ) : null}

      <div>
        <p className="text-sm font-medium text-espresso">
          {t("form.payWith", { provider: providerLabel })}
        </p>
        <p className="text-xs text-wf-gray mt-1">{hint}</p>
      </div>

      {countryOptions && countryOptions.length > 1 && (
        <label className="block text-sm">
          {t("form.country")}
          <select
            value={country}
            onChange={(e) => onCountryChange?.(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-wf-border text-sm focus:outline-none focus:border-gold bg-white"
          >
            {countryOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-sm">
        {t("form.email")}
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="mt-1 w-full px-3 py-2 border border-wf-border text-sm focus:outline-none focus:border-gold bg-white"
        />
      </label>
      <label className="block text-sm">
        {t("form.fullName")}
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="mt-1 w-full px-3 py-2 border border-wf-border text-sm focus:outline-none focus:border-gold bg-white"
        />
      </label>
      <label className="block text-sm">
        {t("form.whatsapp")}
        <span className="block text-xs text-wf-gray font-normal mt-0.5">
          {t("form.whatsappHint")}
        </span>
        <input
          required
          type="tel"
          placeholder={phonePlaceholder}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="mt-1 w-full px-3 py-2 border border-wf-border text-sm focus:outline-none focus:border-gold bg-white"
        />
      </label>
      <label className="block text-sm">
        {t("form.address")}
        {useGhanaCourier && activeCourier === "pickup" ? (
          <span className="block text-xs text-wf-gray font-normal mt-0.5">
            Optional for shop pickup — we will confirm collection details by WhatsApp.
          </span>
        ) : null}
        <input
          required={!(useGhanaCourier && activeCourier === "pickup")}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder={
            useGhanaCourier && activeCourier === "pickup"
              ? pickupInfo?.address || "15 Odaw Street, Kokomlemle, Accra"
              : undefined
          }
          className="mt-1 w-full px-3 py-2 border border-wf-border text-sm focus:outline-none focus:border-gold bg-white"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        {useGhanaCourier && ghanaDelivery?.regions.length ? (
          <label className="block text-sm col-span-2 sm:col-span-1">
            Region
            <select
              required
              value={destinationRegion}
              onChange={(e) => {
                const name = e.target.value;
                const match = ghanaDelivery.regions.find((r) => r.name === name);
                setDestinationRegion(name);
                setRegionId(match?.id ?? null);
              }}
              className="mt-1 w-full px-3 py-2 border border-wf-border text-sm focus:outline-none focus:border-gold bg-white"
            >
              {ghanaDelivery.regions.map((region) => (
                <option key={`${region.id}-${region.name}`} value={region.name}>
                  {region.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block text-sm">
          {t("form.city")}
          <input
            required
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="mt-1 w-full px-3 py-2 border border-wf-border text-sm focus:outline-none focus:border-gold bg-white"
          />
        </label>
        <label className="block text-sm">
          {t("form.postal")}
          <input
            value={form.postcode}
            onChange={(e) => setForm({ ...form, postcode: e.target.value })}
            className="mt-1 w-full px-3 py-2 border border-wf-border text-sm focus:outline-none focus:border-gold bg-white"
          />
        </label>
      </div>

      {useGhanaCourier ? (
        <fieldset className="space-y-2">
          <legend className="text-sm mb-1">{t("checkout.delivery")}</legend>
          {dawuroboOk ? (
            <label className="flex items-center gap-3 border border-wf-border px-3 py-2.5 text-sm cursor-pointer has-[:checked]:border-espresso">
              <input
                type="radio"
                name="courier"
                checked={activeCourier === "dawurobo"}
                onChange={() => setCourierChoice("dawurobo")}
              />
              <span className="flex-1 font-medium">Dawurobo</span>
              <span className="shrink-0 font-medium">
                {ghanaFreeDelivery
                  ? t("checkout.freeDelivery")
                  : dawuroboDisplayGhs != null && dawuroboDisplayGhs > 0
                    ? formatPrice(dawuroboDisplayGhs, currency)
                    : estimating
                      ? "…"
                      : "—"}
              </span>
            </label>
          ) : null}
          {shaqOk ? (
            <label className="flex items-center gap-3 border border-wf-border px-3 py-2.5 text-sm cursor-pointer has-[:checked]:border-espresso">
              <input
                type="radio"
                name="courier"
                checked={activeCourier === "shaqexpress"}
                onChange={() => setCourierChoice("shaqexpress")}
              />
              <span className="flex-1 font-medium">ShaQ Express</span>
              <span className="shrink-0 font-medium">
                {ghanaFreeDelivery
                  ? t("checkout.freeDelivery")
                  : formatPrice(shaqFeeGhs, currency)}
              </span>
            </label>
          ) : null}
          {pickupOk ? (
            <label className="flex items-start gap-3 border border-wf-border px-3 py-2.5 text-sm cursor-pointer has-[:checked]:border-espresso">
              <input
                type="radio"
                name="courier"
                checked={activeCourier === "pickup"}
                onChange={() => setCourierChoice("pickup")}
                className="mt-1"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{t("checkout.pickup")}</span>
                <span className="mt-1 block text-[12px] leading-snug text-mocha">
                  {[
                    pickupInfo?.branchName,
                    pickupInfo?.address,
                    pickupInfo?.city,
                    pickupInfo?.openingHours,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "15 Odaw Street, Kokomlemle, Accra"}
                </span>
              </span>
              <span className="shrink-0 font-medium mt-0.5">{t("checkout.pickupFree")}</span>
            </label>
          ) : null}
          {!dawuroboOk && !shaqOk && !pickupOk ? (
            <p className="text-sm text-red-600">{t("checkout.noDelivery")}</p>
          ) : null}
          <p className="text-xs text-mocha leading-snug border border-dashed border-wf-border px-3 py-2">
            {ghanaFreeDelivery
              ? t("checkout.freeDelivery")
              : t("checkout.freeDeliveryGh", {
                  amount: formatPrice(freeDeliveryThresholdGhs, currency),
                })}
          </p>
        </fieldset>
      ) : null}

      {!useGhanaCourier && methods.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm mb-1">{t("checkout.shipping")}</legend>
          {methods.map((method) => (
            <label
              key={method.id}
              className="flex items-start gap-3 border border-wf-border px-3 py-2 text-sm cursor-pointer has-[:checked]:border-espresso"
            >
              <input
                type="radio"
                name="shipping"
                checked={shippingId === method.id}
                onChange={() => setShippingId(method.id)}
                className="mt-1"
              />
              <span className="flex-1">
                <span className="block font-medium">
                  {method.name} · {method.eta}
                </span>
                {method.description && (
                  <span className="block text-xs text-wf-gray">{method.description}</span>
                )}
              </span>
              <span className="shrink-0">
                {formatPrice(shippingUsdToGhs(method.price, rates), currency)}
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {ghanaSplitPayment ? (
        <fieldset className="space-y-2">
          <legend className="text-sm mb-1">{t("checkout.payment")}</legend>
          <label className="flex items-center gap-3 border border-wf-border px-3 py-2.5 text-sm cursor-pointer has-[:checked]:border-espresso">
            <input
              type="radio"
              name="deliveryPayer"
              checked={deliveryPayer === "recipient"}
              onChange={() => setDeliveryPayer("recipient")}
            />
            <span className="flex-1 font-medium">{t("checkout.payOrderNow")}</span>
            <span className="shrink-0 font-medium">
              {formatPrice(subtotal, currency)}
            </span>
          </label>
          {codEnabled && activeCourier !== "pickup" ? (
            <label className="flex items-start gap-3 border border-wf-border px-3 py-2.5 text-sm cursor-pointer has-[:checked]:border-espresso">
              <input
                type="radio"
                name="deliveryPayer"
                checked={deliveryPayer === "cod"}
                onChange={() => setDeliveryPayer("cod")}
                className="mt-1"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{t("checkout.cashOnDelivery")}</span>
                <span className="mt-1 block text-[12px] leading-snug text-mocha">
                  {t("checkout.codHint")}
                </span>
              </span>
              <span className="shrink-0 font-medium mt-0.5">
                {ghanaFreeDelivery && prepaidDeliveryGhs === 0
                  ? t("checkout.freeDelivery")
                  : formatPrice(prepaidDeliveryGhs, currency)}
              </span>
            </label>
          ) : null}
          <label className="flex items-center gap-3 border border-wf-border px-3 py-2.5 text-sm cursor-pointer has-[:checked]:border-espresso">
            <input
              type="radio"
              name="deliveryPayer"
              checked={deliveryPayer === "partner" || activeCourier === "pickup"}
              onChange={() => setDeliveryPayer("partner")}
            />
            <span className="flex-1 font-medium">
              {activeCourier === "pickup" ? t("checkout.payOrderNow") : t("checkout.payInFull")}
            </span>
            <span className="shrink-0 font-medium">
              {formatPrice(subtotal + prepaidDeliveryGhs, currency)}
            </span>
          </label>
          {pickupInfo && activeCourier !== "pickup" ? (
            <p className="text-xs text-mocha leading-snug border border-dashed border-wf-border px-3 py-2">
              Pickup available at {pickupInfo.branchName || "our shop"}
              {pickupInfo.address ? ` · ${pickupInfo.address}` : ""}
              {pickupInfo.city ? `, ${pickupInfo.city}` : ""}
              {pickupInfo.openingHours ? ` · ${pickupInfo.openingHours}` : ""}
              {pickupInfo.notes ? ` · ${pickupInfo.notes}` : ""}
            </p>
          ) : null}
        </fieldset>
      ) : (
        <fieldset className="space-y-2">
          <legend className="text-sm mb-1">{t("checkout.payment")}</legend>
          <div className="flex items-center gap-3 border border-espresso px-3 py-2.5 text-sm bg-white">
            <span className="flex-1 font-medium">{t("checkout.payInFull")}</span>
            <span className="shrink-0 font-medium">
              {formatPrice(subtotal + flatShippingGhs, currency)}
            </span>
          </div>
        </fieldset>
      )}

      <DeliveryDateSelect
        value={deliveryDate}
        onChange={setDeliveryDate}
        nextDayOnly={useGhanaCourier || country === "GH"}
      />

      <p className="text-sm font-medium pt-2">
        {t("form.totalDue", { price: formatPrice(total, currency) })}
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {whatsappEnabled && (
        <>
          <WhatsAppOrderButton
            kind="cart"
            countryOverride={country}
            lines={items.map((item) => ({
              brand: item.brand,
              model: item.model || "Fragrance",
              quantity: item.quantity,
              sizeMl: isBottleSize(Number(item.bottleSize))
                ? Number(item.bottleSize)
                : undefined,
              price: item.price,
            }))}
            total={orderTotalGhs}
            fulfillment={whatsappFulfillment}
            label={
              payBeforeWhatsApp
                ? t("checkout.whatsappPayFirst")
                : t("checkout.whatsappSubmit")
            }
            hint={
              payBeforeWhatsApp
                ? t("checkout.whatsappPayFirstHint")
                : undefined
            }
            customer={{
              name: form.name,
              email: form.email,
              phone: form.phone,
              address: form.address,
              city: form.city,
              postcode: form.postcode,
              region: useGhanaCourier ? destinationRegion : undefined,
            }}
            disabled={
              !form.name.trim() ||
              !form.email.trim() ||
              !form.phone.trim() ||
              !form.address.trim()
            }
            onDisabledClick={() =>
              setError(t("checkout.whatsappNeedDetails"))
            }
            payBeforeWhatsApp={payBeforeWhatsApp}
            onPayBeforeWhatsApp={() => {
              if (loading) return;
              void handleWhatsAppPayFirst();
            }}
          />

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-wf-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-white px-3 text-wf-gray">{t("checkout.orPayOnline")}</span>
            </div>
          </div>
        </>
      )}

      <button type="submit" disabled={loading} className="btn-gold w-full disabled:opacity-50">
        {loading ? t("form.redirecting", { provider: providerLabel }) : submitLabel}
      </button>
    </form>
  );
}
