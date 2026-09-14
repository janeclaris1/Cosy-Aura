import { AdminCatalogProductsPage } from "@/components/admin/AdminCatalogProductsPage";

export default function AdminBagsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  return <AdminCatalogProductsPage catalog="bags" searchParams={searchParams} />;
}
