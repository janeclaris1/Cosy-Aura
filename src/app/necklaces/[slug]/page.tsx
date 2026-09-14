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
  return buildCatalogProductMetadata("necklaces", params.slug);
}

export default function NecklaceProductPage({ params }: PageProps) {
  return <CatalogProductDetail catalog="necklaces" slug={params.slug} />;
}
