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
  return buildCatalogProductMetadata("shirts", params.slug);
}

export default function ShirtProductPage({ params }: PageProps) {
  return <CatalogProductDetail catalog="shirts" slug={params.slug} />;
}
