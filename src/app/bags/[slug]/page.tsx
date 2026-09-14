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
  return buildCatalogProductMetadata("bags", params.slug);
}

export default function BagProductPage({ params }: PageProps) {
  return <CatalogProductDetail catalog="bags" slug={params.slug} />;
}
