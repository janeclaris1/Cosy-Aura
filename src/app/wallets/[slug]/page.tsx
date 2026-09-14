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
  return buildCatalogProductMetadata("wallets", params.slug);
}

export default function WalletProductPage({ params }: PageProps) {
  return <CatalogProductDetail catalog="wallets" slug={params.slug} />;
}
