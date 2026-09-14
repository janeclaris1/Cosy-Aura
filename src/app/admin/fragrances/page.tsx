import { AdminCatalogProductsPage } from "@/components/admin/AdminCatalogProductsPage";

export default function AdminFragrancesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  return <AdminCatalogProductsPage catalog="fragrances" searchParams={searchParams} />;
}
