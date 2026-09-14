import { AdminCatalogProductsPage } from "@/components/admin/AdminCatalogProductsPage";

export default function AdminShirtsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  return <AdminCatalogProductsPage catalog="shirts" searchParams={searchParams} />;
}
