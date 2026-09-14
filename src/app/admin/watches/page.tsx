import { AdminCatalogProductsPage } from "@/components/admin/AdminCatalogProductsPage";

export default function AdminWatchesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  return <AdminCatalogProductsPage catalog="watches" searchParams={searchParams} />;
}
