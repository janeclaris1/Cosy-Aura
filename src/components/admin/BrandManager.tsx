"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminTableWrap,
  adminInputClass,
  adminTableClass,
  adminTdClass,
  adminThClass,
  adminTheadClass,
  adminTrClass,
} from "@/components/admin/admin-ui";

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  _count: { fragrances: number; series: number };
};

export function BrandManager({ initialBrands }: { initialBrands: BrandRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createBrand(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to create brand");
      setLoading(false);
      return;
    }
    setName("");
    setLoading(false);
    router.refresh();
  }

  async function deleteBrand(id: string, brandName: string) {
    if (!confirm(`Delete brand “${brandName}”? Only empty brands can be removed.`)) {
      return;
    }
    const res = await fetch(`/api/admin/brands/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Delete failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <AdminCard>
        <form
          onSubmit={createBrand}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New brand name"
            className={`${adminInputClass} flex-1`}
            required
          />
          <AdminButton type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Brand"}
          </AdminButton>
        </form>
      </AdminCard>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <AdminTableWrap>
        <table className={adminTableClass}>
          <thead className={adminTheadClass}>
            <tr>
              <th className={adminThClass}>Name</th>
              <th className={adminThClass}>Slug</th>
              <th className={adminThClass}>Fragrances</th>
              <th className={adminThClass}>Series</th>
              <th className={adminThClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {initialBrands.map((brand) => (
              <tr key={brand.id} className={adminTrClass}>
                <td className={`${adminTdClass} font-medium`}>{brand.name}</td>
                <td className={`${adminTdClass} text-mocha`}>{brand.slug}</td>
                <td className={adminTdClass}>{brand._count.fragrances}</td>
                <td className={adminTdClass}>{brand._count.series}</td>
                <td className={adminTdClass}>
                  <button
                    type="button"
                    onClick={() => deleteBrand(brand.id, brand.name)}
                    className="text-red-600 hover:underline text-xs"
                    disabled={brand._count.fragrances > 0}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableWrap>
    </div>
  );
}
