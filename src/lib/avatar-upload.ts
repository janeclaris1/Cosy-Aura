import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function cloudinaryReady(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function fileExtension(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export function validateAvatarFile(mime: string, size: number): string | null {
  if (!ALLOWED_TYPES.has(mime)) {
    return "Use a JPG, PNG, or WebP image.";
  }
  if (size > MAX_BYTES) {
    return "Image must be 2MB or smaller.";
  }
  return null;
}

/** Upload a staff/admin profile photo. Returns a public URL. */
export async function uploadStaffAvatar(
  userId: string,
  buffer: Buffer,
  mime: string
): Promise<string> {
  const validationError = validateAvatarFile(mime, buffer.length);
  if (validationError) throw new Error(validationError);

  if (cloudinaryReady()) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
      analytics: false,
    });

    const uploaded = await cloudinary.uploader.upload(
      `data:${mime};base64,${buffer.toString("base64")}`,
      {
        folder: "cosyaura/avatars",
        public_id: userId,
        overwrite: true,
        resource_type: "image",
      }
    );

    return uploaded.secure_url.replace(
      "/upload/",
      "/upload/c_fill,g_face,w_400,h_400,q_auto,f_auto/"
    );
  }

  const dir = path.join(process.cwd(), "public/uploads/avatars");
  await mkdir(dir, { recursive: true });
  const ext = fileExtension(mime);
  const filename = `${userId}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/avatars/${filename}?v=${Date.now()}`;
}
