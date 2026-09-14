import { AdminCatalogProductsPage } from "@/components/admin/AdminCatalogProductsPage";

export default function AdminSunglassesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  return <AdminCatalogProductsPage catalog="sunglasses" searchParams={searchParams} />;
}
