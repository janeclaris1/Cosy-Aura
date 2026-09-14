import { createHash } from "crypto";
import path from "path";
import {
  cloudinaryReady,
  uploadImageBuffer,
} from "./product-image-storage";

const FETCH_HEADERS = { "User-Agent": "CosyAuraCatalogImport/1.0" };

export type CatalogImageKind = "watches" | "sneakers";

export function catalogImageFolder(
  kind: CatalogImageKind,
  productSlug: string
): string {
  return `cosyaura/catalog/${kind}/${productSlug}`;
}

export function watchImageFolder(productSlug: string): string {
  return catalogImageFolder("watches", productSlug);
}

export function sneakerImageFolder(productSlug: string): string {
  return catalogImageFolder("sneakers", productSlug);
}

export function watchImagePublicId(index: number, source: string): string {
  const hash = createHash("sha256").update(source).digest("hex").slice(0, 12);
  return `img-${String(index + 1).padStart(2, "0")}-${hash}`;
}

/**
 * Download a remote image and store on Cloudinary (production-safe).
 * Dry-run returns a placeholder local path for logging only.
 */
export async function downloadAndStoreCatalogImage(
  remoteSrc: string,
  kind: CatalogImageKind,
  productSlug: string,
  index: number,
  apply: boolean
): Promise<string> {
  const folder = catalogImageFolder(kind, productSlug);
  const publicId = watchImagePublicId(index, remoteSrc);
  const ext = path.extname(new URL(remoteSrc).pathname) || ".jpg";
  const placeholder = `/images/${kind}/${productSlug}/${String(index + 1).padStart(2, "0")}${ext}`;

  if (!apply) {
    console.log(`  would upload → cloudinary:${folder}/${publicId}`);
    return placeholder;
  }

  if (!cloudinaryReady()) {
    throw new Error(
      "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required for --apply."
    );
  }

  const imgRes = await fetch(remoteSrc, { headers: FETCH_HEADERS });
  if (!imgRes.ok) throw new Error(`Image download failed: ${remoteSrc}`);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const url = await uploadImageBuffer(buf, folder, publicId);
  console.log(`  ↑ ${url}`);
  return url;
}

export async function downloadAndStoreWatchImage(
  remoteSrc: string,
  productSlug: string,
  index: number,
  apply: boolean
): Promise<string> {
  return downloadAndStoreCatalogImage(remoteSrc, "watches", productSlug, index, apply);
}

export async function downloadCatalogImagesFromUrls(
  urls: string[],
  kind: CatalogImageKind,
  productSlug: string,
  apply: boolean
): Promise<string[]> {
  const results: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    const src = urls[i].split("?")[0];
    results.push(
      await downloadAndStoreCatalogImage(src, kind, productSlug, i, apply)
    );
  }
  return results;
}

export async function downloadWatchImagesFromUrls(
  urls: string[],
  productSlug: string,
  apply: boolean
): Promise<string[]> {
  return downloadCatalogImagesFromUrls(urls, "watches", productSlug, apply);
}

export async function downloadSneakerImagesFromUrls(
  urls: string[],
  productSlug: string,
  apply: boolean
): Promise<string[]> {
  return downloadCatalogImagesFromUrls(urls, "sneakers", productSlug, apply);
}

export async function downloadWatchImagesFromShopify(
  images: Array<{ src: string; position: number }>,
  productSlug: string,
  apply: boolean
): Promise<string[]> {
  const sorted = [...images].sort((a, b) => a.position - b.position);
  return downloadWatchImagesFromUrls(
    sorted.map((img) => img.src),
    productSlug,
    apply
  );
}

export async function downloadWatchImagesFromEntries(
  entries: Array<{ src: string; sort: number }>,
  productSlug: string,
  apply: boolean
): Promise<string[]> {
  const sorted = [...entries].sort((a, b) => a.sort - b.sort);
  return downloadWatchImagesFromUrls(
    sorted.map((entry) => entry.src),
    productSlug,
    apply
  );
}
