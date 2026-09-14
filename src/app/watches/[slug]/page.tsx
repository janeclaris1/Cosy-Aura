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
  return buildCatalogProductMetadata("watches", params.slug);
}

export default function WatchProductPage({ params }: PageProps) {
  return <CatalogProductDetail catalog="watches" slug={params.slug} />;
}
