import crypto from "crypto";

const BASE_URL = (
  process.env.DAWUROBO_BASE_URL || "https://delivery.dawurobo.com"
).replace(/\/$/, "");

export type DawuroboPayer = "partner" | "recipient";

export type DawuroboCoords = { lat: number; lng: number };

export function dawuroboConfigured(): boolean {
  const key = process.env.DAWUROBO_API_KEY || "";
  const secret = process.env.DAWUROBO_SIGNING_SECRET || "";
  return key.startsWith("pk_") && secret.length > 10;
}

/** Partner-payer needs production key + delivery:wallet:spend. Opt-in via env. */
export function dawuroboPartnerPayerEnabled(): boolean {
  return (
    dawuroboConfigured() &&
    process.env.DAWUROBO_PARTNER_PAYER_ENABLED === "true"
  );
}

export function dawuroboPickupConfig(): {
  address: string;
  contactPerson: string;
  contactPhone: string;
  coordinates: DawuroboCoords;
  region: string;
  city: string;
} | null {
  const lat = Number(process.env.DAWUROBO_PICKUP_LAT);
  const lng = Number(process.env.DAWUROBO_PICKUP_LNG);
  const contactPhone = String(process.env.DAWUROBO_PICKUP_PHONE || "").trim();
  const contactPerson = String(
    process.env.DAWUROBO_PICKUP_CONTACT || "COSY AURA"
  ).trim();
  const address = String(
    process.env.DAWUROBO_PICKUP_ADDRESS || "Accra, Ghana"
  ).trim();
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !contactPhone) {
    return null;
  }
  return {
    address,
    contactPerson,
    contactPhone,
    coordinates: { lat, lng },
    region: String(process.env.DAWUROBO_PICKUP_REGION || "Greater Accra").trim(),
    city: String(process.env.DAWUROBO_PICKUP_CITY || "Accra").trim(),
  };
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function buildSignature(args: {
  method: string;
  pathname: string;
  query: string;
  body: string;
  timestamp: string;
  nonce: string;
  signingSecret: string;
}): string {
  const canonical = [
    args.method.toUpperCase(),
    args.pathname,
    args.query || "",
    sha256Hex(args.body || ""),
    args.timestamp,
    args.nonce,
  ].join("\n");
  return crypto
    .createHmac("sha256", args.signingSecret)
    .update(canonical, "utf8")
    .digest("hex");
}

export async function dawuroboRequest<T = unknown>(
  operation: string,
  bodyObj: Record<string, unknown> | null = null
): Promise<{ ok: boolean; status: number; data: T }> {
  const apiKey = process.env.DAWUROBO_API_KEY || "";
  const signingSecret = process.env.DAWUROBO_SIGNING_SECRET || "";
  if (!apiKey || !signingSecret) {
    return {
      ok: false,
      status: 503,
      data: { status: "error", message: "Dawurobo is not configured" } as T,
    };
  }

  const method = "POST";
  const pathname = `/api/v1/delivery/${operation}`;
  const query = "";
  const body = bodyObj ? JSON.stringify(bodyObj) : "";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();
  const signature = buildSignature({
    method,
    pathname,
    query,
    body,
    timestamp,
    nonce,
    signingSecret,
  });

  const res = await fetch(`${BASE_URL}${pathname}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": apiKey,
      "X-Signature": signature,
      "X-Timestamp": timestamp,
      "X-Nonce": nonce,
    },
    body: body || undefined,
  });

  const raw = await res.text();
  let data: T;
  try {
    data = JSON.parse(raw) as T;
  } catch {
    data = { status: "error", message: raw.slice(0, 200) } as T;
  }
  return { ok: res.ok, status: res.status, data };
}

export type DawuroboEstimateResult = {
  status: string;
  message?: string;
  data?: {
    estimated_price?: number;
    estimated_delivery_time?: string;
    delivery_window?: { earliest?: string; latest?: string };
    available_options?: Array<{ priority?: string; price?: number }>;
  };
  code?: string;
};

export async function estimateDawuroboDelivery(input: {
  delivery: DawuroboCoords;
  pickup?: DawuroboCoords;
  priority?: string;
}): Promise<DawuroboEstimateResult> {
  const pickup = input.pickup || dawuroboPickupConfig()?.coordinates;
  const body: Record<string, unknown> = {
    delivery_location: { coordinates: input.delivery },
    priority: input.priority || "standard",
  };
  if (pickup) {
    body.pickup_location = { coordinates: pickup };
  }
  const res = await dawuroboRequest<DawuroboEstimateResult>("orders.estimate", body);
  return res.data;
}

export type DawuroboCreateResult = {
  status: string;
  message?: string;
  code?: string;
  data?: {
    order_details?: { order_id?: string; estimated_delivery?: string };
    status?: string;
  };
};

export async function createDawuroboOrder(input: {
  orderReference: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryRegion: string;
  deliveryCoords: DawuroboCoords;
  item: string;
  payer: DawuroboPayer;
  deliveryDateIso: string;
  specialInstructions?: string;
}): Promise<DawuroboCreateResult> {
  const pickup = dawuroboPickupConfig();
  if (!pickup) {
    return {
      status: "error",
      message:
        "Dawurobo pickup is not configured. Set DAWUROBO_PICKUP_LAT, DAWUROBO_PICKUP_LNG, and DAWUROBO_PICKUP_PHONE.",
    };
  }

  const webhookUrl = process.env.DAWUROBO_WEBHOOK_URL?.trim() || undefined;
  const body: Record<string, unknown> = {
    order_reference: input.orderReference,
    customer: {
      name: input.customerName,
      phone: input.customerPhone,
    },
    delivery: {
      address: input.deliveryAddress,
      city: input.deliveryCity,
      region: input.deliveryRegion,
      coordinates: input.deliveryCoords,
    },
    item: input.item,
    pickup: {
      address: pickup.address,
      contact_person: pickup.contactPerson,
      contact_phone: pickup.contactPhone,
      coordinates: pickup.coordinates,
    },
    payment: {
      payer: input.payer,
      is_paid: true,
    },
    delivery_date: `${input.deliveryDateIso}T10:00:00Z`,
  };
  if (input.specialInstructions) {
    body.special_instructions = input.specialInstructions;
  }
  if (webhookUrl) {
    body.webhook_url = webhookUrl;
  }

  const res = await dawuroboRequest<DawuroboCreateResult>("orders.create", body);
  return res.data;
}

export function verifyDawuroboWebhook(
  rawBody: string,
  signature: string | null
): boolean {
  const secret = process.env.DAWUROBO_WEBHOOK_SECRET || "";
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(signature, "utf8");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
