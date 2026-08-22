import { v2 as cloudinary } from "cloudinary";
import { receiptShortId, receiptToken } from "./order-receipt";

export type PublishedReceipt = {
  pdfUrl?: string;
  imageUrl: string;
};

function siteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    ""
  ).replace(/\/$/, "");
}

function cloudinaryReady(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export function signedReceiptUrl(orderId: string): string | null {
  const base = siteBaseUrl();
  if (!base || /localhost|127\.0\.0\.1/i.test(base)) return null;
  return `${base}/api/receipts/${orderId}?t=${receiptToken(orderId)}`;
}

async function urlIsPublicImage(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    if (!res.ok) return false;
    const type = (res.headers.get("content-type") || "").toLowerCase();
    return type.includes("png") || type.includes("jpeg") || type.includes("jpg") || type.includes("image");
  } catch {
    return false;
  }
}

export async function publishReceiptPdf(
  orderId: string,
  pdf: Buffer
): Promise<PublishedReceipt | null> {
  if (cloudinaryReady()) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
      analytics: false,
    });

    const shortId = receiptShortId(orderId);

    try {
      const uploaded = await cloudinary.uploader.upload(
        `data:application/pdf;base64,${pdf.toString("base64")}`,
        {
          resource_type: "image",
          folder: "cosyaura/receipts",
          public_id: `receipt-${shortId}`,
          overwrite: true,
          type: "upload",
        }
      );

      const imageUrl = uploaded.secure_url.replace(
        "/image/upload/",
        "/image/upload/f_png,q_auto,w_1200/"
      );
      const ok = await urlIsPublicImage(imageUrl);
      console.log("[receipt] published image", { imageUrl, public: ok });
      if (ok) return { imageUrl, pdfUrl: uploaded.secure_url };
    } catch (error) {
      console.error("[receipt] Cloudinary image upload failed:", error);
    }
  }

  const signed = signedReceiptUrl(orderId);
  if (signed) {
    console.log("[receipt] using signed URL for WhatsApp/email attachment");
    return { imageUrl: signed, pdfUrl: signed };
  }

  console.warn(
    "[receipt] no public receipt URL — set CLOUDINARY_* or NEXT_PUBLIC_SITE_URL (non-localhost) for PDF attachments"
  );
  return null;
}
