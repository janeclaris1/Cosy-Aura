const DEFAULT_BASE = "https://test-partner.shaqexpress.com/api/v1";

type ShaqLoginResponse = {
  message?: string;
  data?: { token?: string };
};

type ShaqRegion = { id: number; name: string };

type ShaqRegionsResponse = {
  message?: string;
  data?: ShaqRegion[];
};

export type ShaqCreatePackageResponse = {
  message?: string;
  data?: {
    partnerRef?: string;
    trackingNumber?: string;
    status?: string;
    statusDescription?: string;
  };
};

let tokenCache: { token: string; expiresAt: number } | null = null;

function baseUrl(): string {
  return (process.env.SHAQEXPRESS_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
}

export function shaqexpressConfigured(): boolean {
  const id = process.env.SHAQEXPRESS_IDENTIFIER || "";
  const secret = process.env.SHAQEXPRESS_SECRET || "";
  return Boolean(id && secret);
}

export function shaqexpressSourceAddress(): string {
  return (
    process.env.SHAQEXPRESS_SOURCE_ADDRESS ||
    process.env.DAWUROBO_PICKUP_ADDRESS ||
    "Accra, Ghana"
  ).trim();
}

async function getToken(): Promise<string> {
  const identifier = process.env.SHAQEXPRESS_IDENTIFIER || "";
  const secret = process.env.SHAQEXPRESS_SECRET || "";
  if (!identifier || !secret) {
    throw new Error("ShaQ Express is not configured");
  }

  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now) {
    return tokenCache.token;
  }

  const res = await fetch(`${baseUrl()}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ identifier, secret }),
  });

  const data = (await res.json()) as ShaqLoginResponse;
  const token = data.data?.token;
  if (!res.ok || !token) {
    throw new Error(data.message || "ShaQ Express login failed");
  }

  // Tokens last 7 days — refresh after 6 days
  tokenCache = { token, expiresAt: now + 6 * 24 * 60 * 60 * 1000 };
  return token;
}

async function shaqRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const token = await getToken();
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const data = (await res.json()) as T;
  return { ok: res.ok, status: res.status, data };
}

export async function getShaqexpressRegions(): Promise<ShaqRegion[]> {
  const res = await shaqRequest<ShaqRegionsResponse>("/setup/regions", {
    method: "GET",
  });
  if (!res.ok || !Array.isArray(res.data.data)) {
    throw new Error(res.data.message || "Could not load ShaQ Express regions");
  }
  return res.data.data.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createShaqexpressPackage(input: {
  partnerRef: string;
  customerName: string;
  customerPhone: string;
  destinationRegion: string;
  destinationCity: string;
  destinationAddress: string;
  destinationAddressLine2?: string;
  regionId?: number;
  description: string;
  valueGhs: number;
  amountToCollectGhs: number;
  items: Array<{ name: string; quantity: number }>;
  specialInstructions?: string;
}): Promise<ShaqCreatePackageResponse> {
  const body: Record<string, unknown> = {
    partner_ref: input.partnerRef,
    customer_name: input.customerName,
    customer_phone_1: input.customerPhone,
    source_address_line_1: shaqexpressSourceAddress(),
    destination_region: input.destinationRegion,
    destination_city: input.destinationCity,
    destination_address_line_1: input.destinationAddress,
    description: input.description,
    units: 1,
    type: "box",
    handling: "fragile",
    value: input.valueGhs,
    amount_to_collect: input.amountToCollectGhs,
    items: input.items,
  };
  if (input.destinationAddressLine2) {
    body.destination_address_line_2 = input.destinationAddressLine2;
  }
  if (input.regionId) {
    body.region_id = input.regionId;
  }
  if (input.specialInstructions) {
    body.special_instructions = input.specialInstructions;
  }

  const res = await shaqRequest<ShaqCreatePackageResponse>("/packages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.data;
}
