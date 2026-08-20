"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      <form
        onSubmit={createBrand}
        className="bg-white border border-wf-border rounded-lg p-5 flex flex-col sm:flex-row gap-3"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New brand name"
          className="flex-1 px-4 py-2.5 border border-wf-border rounded text-sm focus:outline-none focus:border-gold"
          required
        />
        <button type="submit" disabled={loading} className="btn-gold disabled:opacity-50">
          {loading ? "Adding..." : "Add Brand"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="border border-wf-border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-wf-light">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Slug</th>
              <th className="text-left p-3 font-medium">Fragrances</th>
              <th className="text-left p-3 font-medium">Series</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initialBrands.map((brand) => (
              <tr key={brand.id} className="border-t border-wf-border">
                <td className="p-3 font-medium">{brand.name}</td>
                <td className="p-3 text-wf-gray">{brand.slug}</td>
                <td className="p-3">{brand._count.fragrances}</td>
                <td className="p-3">{brand._count.series}</td>
                <td className="p-3">
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
      </div>
    </div>
  );
}
