import {
  buildCatalogProductMetadata,
  CatalogProductDetail,
} from "@/components/products/CatalogProductDetail";
import type { Metadata } from "next";

export const revalidate = 300;

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return buildCatalogProductMetadata("sunglasses", params.slug);
}

export default function SunglassesProductPage({ params }: PageProps) {
  return <CatalogProductDetail catalog="sunglasses" slug={params.slug} />;
}
