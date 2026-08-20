const DEFAULT_NOTIFY_TO = "+233500741699";

const CALLING_CODES: Record<string, string> = {
  GH: "233",
  NG: "234",
  CM: "237",
  GA: "241",
  CG: "242",
  TD: "235",
  GQ: "240",
  CF: "236",
  US: "1",
  CA: "1",
  GB: "44",
  FR: "33",
  DE: "49",
  IT: "39",
  ES: "34",
  NL: "31",
  BE: "32",
  AE: "971",
  SA: "966",
  ZA: "27",
  KE: "254",
  CI: "225",
  SN: "221",
  TG: "228",
  BJ: "229",
  BF: "226",
  ML: "223",
  NE: "227",
  IN: "91",
  AU: "61",
  NZ: "64",
  IE: "353",
  PT: "351",
  CH: "41",
  AT: "43",
  SE: "46",
  NO: "47",
  DK: "45",
  FI: "358",
  PL: "48",
  BR: "55",
  MX: "52",
  CN: "86",
  JP: "81",
  KR: "82",
  SG: "65",
  MY: "60",
  PH: "63",
  ID: "62",
  PK: "92",
  BD: "880",
  EG: "20",
  MA: "212",
  TZ: "255",
  UG: "256",
  RW: "250",
  ET: "251",
};

export function getWhatsAppNotifyTo(): string {
  const raw = process.env.WHATSAPP_NOTIFY_TO || DEFAULT_NOTIFY_TO;
  return normalizeWhatsAppNumber(raw);
}

export function normalizeWhatsAppNumber(
  input: string,
  countryHint?: string | null
): string {
  let digits = String(input || "").trim();
  if (digits.startsWith("00")) digits = digits.slice(2);
  digits = digits.replace(/[^\d]/g, "");
  if (!digits) return "";

  const cc = countryHint
    ? CALLING_CODES[countryHint.trim().toUpperCase()]
    : undefined;

  if (cc) {
    if (digits.startsWith(cc) && digits.length >= cc.length + 7) {
      return digits;
    }
    if (digits.startsWith("0")) {
      digits = cc + digits.slice(1);
    } else if (!digits.startsWith(cc) && digits.length <= 10) {
      digits = cc + digits;
    }
  }

  if (digits.length < 10 || digits.length > 15) return "";
  return digits;
}

const TWILIO_SANDBOX_FROM = "whatsapp:+14155238886";

function twilioFrom(): string {
  const from = process.env.TWILIO_WHATSAPP_FROM || TWILIO_SANDBOX_FROM;
  return from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
}

function whatsappConfigured(): boolean {
  return Boolean(
    (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ||
      (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) ||
      process.env.CALLMEBOT_API_KEY
  );
}

type WhatsAppSendResult = { ok: boolean; error?: string; provider?: string };

export async function sendWhatsAppText(
  text: string,
  to = getWhatsAppNotifyTo(),
  countryHint?: string | null,
  mediaUrl?: string
): Promise<WhatsAppSendResult> {
  const phone = normalizeWhatsAppNumber(to, countryHint);
  if (!phone) {
    return { ok: false, error: "No WhatsApp recipient number" };
  }

  if (!whatsappConfigured()) {
    console.warn(
      "[whatsapp] skipped - set Twilio, WhatsApp Cloud API, or CALLMEBOT_API_KEY"
    );
    return {
      ok: false,
      error:
        "WhatsApp is not configured. Add Twilio, Meta Cloud API, or CallMeBot credentials.",
    };
  }

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    return sendViaTwilio(phone, text, mediaUrl);
  }

  if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    return sendViaMetaCloud(phone, text);
  }

  if (process.env.CALLMEBOT_API_KEY) {
    return sendViaCallMeBot(phone, text);
  }

  return { ok: false, error: "WhatsApp is not configured" };
}

/** Customer receipts: Twilio or Meta only (CallMeBot cannot message arbitrary buyers). */
export async function sendCustomerWhatsAppText(
  text: string,
  to: string,
  countryHint?: string | null,
  mediaUrl?: string
): Promise<WhatsAppSendResult> {
  const phone = normalizeWhatsAppNumber(to, countryHint);
  if (!phone) {
    return { ok: false, error: "No customer WhatsApp number" };
  }

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    return sendViaTwilio(phone, text, mediaUrl);
  }

  if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    return sendViaMetaCloud(phone, text);
  }

  return {
    ok: false,
    error:
      "Customer WhatsApp receipts need Twilio or Meta Cloud API (CallMeBot cannot message customers).",
  };
}

export async function sendWhatsAppDocument(input: {
  text: string;
  to: string;
  countryHint?: string | null;
  pdfUrl?: string | null;
  imageUrl?: string | null;
  customer?: boolean;
}): Promise<WhatsAppSendResult> {
  const send = (text: string, mediaUrl?: string) =>
    input.customer
      ? sendCustomerWhatsAppText(text, input.to, input.countryHint, mediaUrl)
      : sendWhatsAppText(text, input.to, input.countryHint, mediaUrl);

  if (input.imageUrl) {
    const withImage = await send(input.text, input.imageUrl);
    if (withImage.ok) return withImage;
    console.warn("[whatsapp] image receipt failed, sending text only:", withImage.error);
  }

  return send(input.text);
}

async function sendViaTwilio(
  phone: string,
  text: string,
  mediaUrl?: string
): Promise<WhatsAppSendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const body = new URLSearchParams({
    From: twilioFrom(),
    To: `whatsapp:+${phone}`,
    Body: text,
  });
  if (mediaUrl) body.append("MediaUrl", mediaUrl);

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );
    const payload = await res.text();
    if (!res.ok) {
      console.error("[whatsapp] Twilio failed:", payload, "media:", mediaUrl || "none");
      return { ok: false, error: payload.slice(0, 400), provider: "twilio" };
    }
    console.log("[whatsapp] Twilio accepted", {
      to: phone.slice(-4),
      media: Boolean(mediaUrl),
    });
    return { ok: true, provider: "twilio" };
  } catch (error) {
    console.error("[whatsapp] Twilio send failed:", error);
    return {
      ok: false,
      provider: "twilio",
      error: error instanceof Error ? error.message : "Twilio send failed",
    };
  }
}

async function sendViaMetaCloud(
  phone: string,
  text: string
): Promise<{ ok: boolean; error?: string; provider?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const template = process.env.WHATSAPP_TEMPLATE_NAME?.trim();
  const lang = process.env.WHATSAPP_TEMPLATE_LANG || "en";

  const payload = template
    ? {
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: template,
          language: { code: lang },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: text.slice(0, 1024) }],
            },
          ],
        },
      }
    : {
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { preview_url: false, body: text.slice(0, 4096) },
      };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    const body = await res.text();
    if (!res.ok) {
      console.error("[whatsapp] Meta Cloud API failed:", body);
      return { ok: false, error: body.slice(0, 300), provider: "meta" };
    }
    return { ok: true, provider: "meta" };
  } catch (error) {
    console.error("[whatsapp] Meta send failed:", error);
    return {
      ok: false,
      provider: "meta",
      error: error instanceof Error ? error.message : "Meta send failed",
    };
  }
}

async function sendViaCallMeBot(
  phone: string,
  text: string
): Promise<{ ok: boolean; error?: string; provider?: string }> {
  const apikey = process.env.CALLMEBOT_API_KEY!;
  const url = new URL("https://api.callmebot.com/whatsapp.php");
  url.searchParams.set("phone", phone);
  url.searchParams.set("apikey", apikey);
  url.searchParams.set("text", text);

  try {
    const res = await fetch(url.toString());
    const body = await res.text();
    if (!res.ok || /error|invalid|apikey/i.test(body)) {
      console.error("[whatsapp] CallMeBot failed:", body);
      return { ok: false, error: body.slice(0, 300), provider: "callmebot" };
    }
    return { ok: true, provider: "callmebot" };
  } catch (error) {
    console.error("[whatsapp] CallMeBot send failed:", error);
    return {
      ok: false,
      provider: "callmebot",
      error: error instanceof Error ? error.message : "CallMeBot send failed",
    };
  }
}
