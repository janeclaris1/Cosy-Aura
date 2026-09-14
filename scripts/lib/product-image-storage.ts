import { readFile } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";

export function cloudinaryReady(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
    analytics: false,
  });
}

/** Cloudinary delivery URL with sensible defaults for product cards. */
export function optimizeProductImageUrl(secureUrl: string): string {
  if (!secureUrl.includes("res.cloudinary.com") || !secureUrl.includes("/upload/")) {
    return secureUrl;
  }
  if (secureUrl.includes("/upload/c_")) return secureUrl;
  return secureUrl.replace("/upload/", "/upload/c_limit,w_1200,q_auto,f_auto/");
}

/**
 * Upload a local catalog image file to Cloudinary.
 * Returns a public HTTPS URL suitable for FragranceImage.url.
 */
export async function uploadLocalCatalogImage(
  localFilePath: string,
  cloudFolder: string,
  publicId: string
): Promise<string> {
  if (!cloudinaryReady()) {
    throw new Error(
      "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required for production image hosting."
    );
  }

  configureCloudinary();

  const uploaded = await cloudinary.uploader.upload(localFilePath, {
    folder: cloudFolder,
    public_id: publicId,
    overwrite: true,
    resource_type: "image",
  });

  return optimizeProductImageUrl(uploaded.secure_url);
}

/** Resolve /images/watches/... to an absolute filesystem path. */
export function localPathFromPublicUrl(publicUrl: string): string {
  const relative = publicUrl.replace(/^\//, "");
  return path.join(process.cwd(), "public", relative);
}

/** Upload from a public URL path if the file exists locally. */
export async function migratePublicUrlToCloudinary(
  publicUrl: string,
  cloudFolder: string,
  publicId: string
): Promise<string | null> {
  const filePath = localPathFromPublicUrl(publicUrl);
  try {
    await readFile(filePath);
  } catch {
    return null;
  }
  return uploadLocalCatalogImage(filePath, cloudFolder, publicId);
}

/** Upload an in-memory image buffer to Cloudinary. */
export async function uploadImageBuffer(
  buffer: Buffer,
  cloudFolder: string,
  publicId: string
): Promise<string> {
  if (!cloudinaryReady()) {
    throw new Error(
      "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required for production image hosting."
    );
  }

  configureCloudinary();

  const uploaded = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: cloudFolder,
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) reject(error ?? new Error("Cloudinary upload failed"));
        else resolve(result);
      }
    );
    stream.end(buffer);
  });

  return optimizeProductImageUrl(uploaded.secure_url);
}
