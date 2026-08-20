/**
 * Live shipping rates via EasyPost (Aramex, DHL Express, FedEx).
 * Connect those carriers in the EasyPost dashboard, then set EASYPOST_API_KEY.
 */

export type ShippingCarrierId = "aramex" | "dhl" | "fedex";

export interface ShippingAddressInput {
  name?: string;
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface LiveShippingRate {
  id: string;
  carrierId: ShippingCarrierId;
  carrier: string;
  service: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  eta: string;
  deliveryDays: number | null;
}

/** Fallback rates when EasyPost is not configured or returns no quotes. */
export const FALLBACK_SHIPPING_RATES: LiveShippingRate[] = [
  {
    id: "standard",
    carrierId: "aramex",
    carrier: "Standard",
    service: "Standard",
    name: "Standard Shipping",
    description: "Tracked delivery with discreet packaging",
    price: 5,
    currency: "USD",
    eta: "5-10 business days",
    deliveryDays: 7,
  },
];

const CARRIER_MAP: Record<string, ShippingCarrierId> = {
  aramex: "aramex",
  dhl: "dhl",
  dhlexpress: "dhl",
  "dhl express": "dhl",
  fedex: "fedex",
  "fedexdefault": "fedex",
};

export function mapCarrierId(carrier: string): ShippingCarrierId | null {
  const key = carrier.replace(/[\s_-]/g, "").toLowerCase();
  if (CARRIER_MAP[key]) return CARRIER_MAP[key];
  if (key.includes("aramex")) return "aramex";
  if (key.includes("dhl")) return "dhl";
  if (key.includes("fedex")) return "fedex";
  return null;
}

export function displayCarrierName(carrierId: ShippingCarrierId, carrier: string): string {
  if (carrierId === "dhl") return "DHL Express";
  if (carrierId === "fedex") return "FedEx";
  if (carrierId === "aramex") return "Aramex";
  return carrier;
}

export function formatEta(deliveryDays: number | null | undefined): string {
  if (deliveryDays == null || Number.isNaN(deliveryDays)) {
    return "Transit time varies by destination";
  }
  if (deliveryDays <= 1) return "1 business day";
  return `${deliveryDays} business days`;
}

export function getShipFromAddress(): ShippingAddressInput {
  return {
    name: process.env.SHIP_FROM_NAME || "COSY AURA",
    street1: process.env.SHIP_FROM_STREET1 || "1 Market St",
    street2: process.env.SHIP_FROM_STREET2 || undefined,
    city: process.env.SHIP_FROM_CITY || "San Francisco",
    state: process.env.SHIP_FROM_STATE || "CA",
    zip: process.env.SHIP_FROM_ZIP || "94105",
    country: (process.env.SHIP_FROM_COUNTRY || "US").toUpperCase(),
    phone: process.env.SHIP_FROM_PHONE || "4155550100",
    email: process.env.SHIP_FROM_EMAIL || "shipping@cosyaura.com",
  };
}

export function getDefaultParcel() {
  return {
    length: Number(process.env.SHIP_PARCEL_LENGTH || 8),
    width: Number(process.env.SHIP_PARCEL_WIDTH || 6),
    height: Number(process.env.SHIP_PARCEL_HEIGHT || 4),
    weight: Number(process.env.SHIP_PARCEL_WEIGHT || 1.5),
    distance_unit: "in" as const,
    mass_unit: "lb" as const,
  };
}

export function isEasyPostConfigured(): boolean {
  return Boolean(process.env.EASYPOST_API_KEY?.trim());
}

interface EasyPostRate {
  id?: string;
  carrier?: string;
  service?: string;
  rate?: string;
  currency?: string;
  delivery_days?: number | null;
  est_delivery_days?: number | null;
}

interface EasyPostShipmentResponse {
  id?: string;
  rates?: EasyPostRate[];
  messages?: { carrier?: string; message?: string }[];
  error?: { message?: string };
}

function normalizeRate(rate: EasyPostRate): LiveShippingRate | null {
  if (!rate.carrier || !rate.service || !rate.rate) return null;
  const carrierId = mapCarrierId(rate.carrier);
  if (!carrierId) return null;

  const deliveryDays = rate.delivery_days ?? rate.est_delivery_days ?? null;
  const price = Number(rate.rate);
  if (!Number.isFinite(price)) return null;

  const name = displayCarrierName(carrierId, rate.carrier);
  return {
    id: rate.id || `${carrierId}-${rate.service}-${price}`,
    carrierId,
    carrier: rate.carrier,
    service: rate.service,
    name: `${name} · ${rate.service}`,
    description: `${name} ${rate.service}`,
    price,
    currency: (rate.currency || "USD").toUpperCase(),
    eta: formatEta(deliveryDays),
    deliveryDays,
  };
}

/** Keep the cheapest rate per carrier for a cleaner checkout UI. */
export function pickBestRatesPerCarrier(rates: LiveShippingRate[]): LiveShippingRate[] {
  const best = new Map<ShippingCarrierId, LiveShippingRate>();
  for (const rate of rates) {
    const existing = best.get(rate.carrierId);
    if (!existing || rate.price < existing.price) {
      best.set(rate.carrierId, rate);
    }
  }
  const order: ShippingCarrierId[] = ["aramex", "fedex", "dhl"];
  return order.map((id) => best.get(id)).filter(Boolean) as LiveShippingRate[];
}

export async function fetchLiveShippingRates(
  to: ShippingAddressInput
): Promise<{ rates: LiveShippingRate[]; source: "easypost" | "fallback"; error?: string }> {
  if (!isEasyPostConfigured()) {
    return { rates: FALLBACK_SHIPPING_RATES, source: "fallback", error: "EasyPost not configured" };
  }

  const apiKey = process.env.EASYPOST_API_KEY!.trim();
  const from = getShipFromAddress();
  const parcel = getDefaultParcel();

  try {
    const auth = Buffer.from(`${apiKey}:`).toString("base64");
    const res = await fetch("https://api.easypost.com/v2/shipments", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shipment: {
          to_address: {
            name: to.name || "Customer",
            street1: to.street1,
            street2: to.street2 || undefined,
            city: to.city,
            state: to.state || undefined,
            zip: to.zip,
            country: to.country.toUpperCase(),
            phone: to.phone || undefined,
            email: to.email || undefined,
          },
          from_address: {
            name: from.name,
            street1: from.street1,
            street2: from.street2 || undefined,
            city: from.city,
            state: from.state || undefined,
            zip: from.zip,
            country: from.country,
            phone: from.phone,
            email: from.email,
          },
          parcel,
        },
      }),
      cache: "no-store",
    });

    const data = (await res.json()) as EasyPostShipmentResponse;
    if (!res.ok) {
      const message = data.error?.message || `EasyPost error ${res.status}`;
      console.error("[shipping] EasyPost rate error:", message, data.messages);
      return { rates: FALLBACK_SHIPPING_RATES, source: "fallback", error: message };
    }

    const live = (data.rates || [])
      .map(normalizeRate)
      .filter(Boolean) as LiveShippingRate[];

    const filtered = pickBestRatesPerCarrier(live);
    if (filtered.length === 0) {
      const hints = (data.messages || [])
        .map((m) => `${m.carrier || "carrier"}: ${m.message || ""}`)
        .filter(Boolean)
        .slice(0, 3)
        .join("; ");
      return {
        rates: FALLBACK_SHIPPING_RATES,
        source: "fallback",
        error: hints || "No Aramex/DHL/FedEx rates returned",
      };
    }

    return { rates: filtered, source: "easypost" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rate request failed";
    console.error("[shipping] EasyPost request failed:", message);
    return { rates: FALLBACK_SHIPPING_RATES, source: "fallback", error: message };
  }
}

export function findRateById(
  rates: LiveShippingRate[],
  rateId: string | undefined | null
): LiveShippingRate | undefined {
  if (!rateId) return undefined;
  return rates.find((rate) => rate.id === rateId);
}

export function getShippingMethod(id: string | undefined | null): { name: string } | undefined {
  if (!id) return undefined;
  const fallback = FALLBACK_SHIPPING_RATES.find((r) => r.id === id || r.carrierId === id);
  if (fallback) return { name: fallback.name };
  // Stored as "FedEx · SERVICE" or carrier id
  return { name: id.replace(/_/g, " ") };
}
