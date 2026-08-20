import crypto from "crypto";
import { rateFromGhs } from "@/lib/fx";

export const PAYSTACK_COUNTRIES = ["GH", "NG"] as const;
export type PaystackCountry = (typeof PAYSTACK_COUNTRIES)[number];

export function isPaystackCountry(code: string | null | undefined): code is PaystackCountry {
  return code === "GH" || code === "NG";
}

export function paystackSecretForCountry(country: string): string | null {
  if (country === "NG" && process.env.PAYSTACK_SECRET_KEY_NG?.startsWith("sk_")) {
    return process.env.PAYSTACK_SECRET_KEY_NG;
  }
  const key = process.env.PAYSTACK_SECRET_KEY;
  return key?.startsWith("sk_") ? key : null;
}

export function paystackCharge(
  ghsTotal: number,
  country: PaystackCountry,
  rates?: Record<string, number>
): { amount: number; currency: "GHS" | "NGN"; displayTotal: number } {
  if (country === "NG" && process.env.PAYSTACK_SECRET_KEY_NG?.startsWith("sk_")) {
    const rate = rateFromGhs(rates, "NGN");
    const naira = ghsTotal * rate;
    return {
      amount: Math.round(naira * 100),
      currency: "NGN",
      displayTotal: naira,
    };
  }
  return {
    amount: Math.round(ghsTotal * 100),
    currency: "GHS",
    displayTotal: ghsTotal,
  };
}

export function paystackChannels(country: PaystackCountry): string[] {
  if (country === "GH") return ["card", "mobile_money"];
  return ["card", "bank", "ussd", "bank_transfer"];
}

type PaystackInitResponse = {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

export async function initializePaystackTransaction(input: {
  secret: string;
  email: string;
  amount: number;
  currency: "GHS" | "NGN";
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
  channels: string[];
}): Promise<PaystackInitResponse> {
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
      channels: input.channels,
    }),
  });
  return (await res.json()) as PaystackInitResponse;
}

export type PaystackVerifiedTxn = {
  status: boolean;
  message: string;
  data?: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    paid_at?: string;
    customer?: { email?: string; phone?: string };
    metadata?: {
      orderId?: string;
      [key: string]: unknown;
    };
  };
};

export async function verifyPaystackTransaction(
  reference: string,
  secret?: string
): Promise<PaystackVerifiedTxn> {
  const keys = [
    secret,
    process.env.PAYSTACK_SECRET_KEY,
    process.env.PAYSTACK_SECRET_KEY_NG,
  ].filter((key): key is string => Boolean(key?.startsWith("sk_")));

  let last: PaystackVerifiedTxn = { status: false, message: "Not verified" };
  const tried = new Set<string>();

  for (const key of keys) {
    if (tried.has(key)) continue;
    tried.add(key);
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${key}` } }
    );
    last = (await res.json()) as PaystackVerifiedTxn;
    if (last.status && last.data?.status === "success") return last;
  }

  return last;
}

export function verifyPaystackSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const secrets = [process.env.PAYSTACK_SECRET_KEY, process.env.PAYSTACK_SECRET_KEY_NG].filter(
    (key): key is string => Boolean(key?.startsWith("sk_"))
  );
  return secrets.some((secret) => {
    const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    return hash === signature;
  });
}
