"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MANAGED_STOCK_COUNTRIES } from "@/lib/country-stock";

interface Brand {
  id: string;
  name: string;
  slug: string;
}

interface FragranceFormProps {
  brands: Brand[];
  fragrance?: {
    id: string;
    brandId: string;
    model: string;
    reference: string;
    slug: string;
    description: string;
    conditionReport: string | null;
    price: number;
    condition: string;
    year: number | null;
    fragranceFamily: string;
    bottleMaterial: string;
    bottleDetail: string | null;
    bottleSize: number;
    capType: string;
    liquidColor: string | null;
    longevity: string | null;
    bottleShape: string | null;
    concentration: string;
    topNotes: string[];
    heartNotes: string[];
    baseNotes: string[];
    sillage: string;
    sustainabilityScore: number;
    isVegan: boolean;
    isCrueltyFree: boolean;
    sampleAvailable: boolean;
    gender: string;
    collection: string | null;
    stock: number;
    rating: number | null;
    featured: boolean;
    category: string | null;
    images: { url: string }[];
    countryStocks?: { country: string; inStock: boolean }[];
  };
}

const CATEGORIES = ["Floral", "Oriental", "Woody", "Fresh", "Niche"];

function notesToString(notes?: string[]) {
  return (notes || []).join(", ");
}

function parseNotes(value: string) {
  return value
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

export function FragranceForm({ brands, fragrance }: FragranceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const initialGlobalInStock = (fragrance?.stock ?? 0) > 0;
  const [countryStock, setCountryStock] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const c of MANAGED_STOCK_COUNTRIES) {
      const row = fragrance?.countryStocks?.find(
        (s) => s.country.toUpperCase() === c.code
      );
      map[c.code] = row ? row.inStock : initialGlobalInStock;
    }
    return map;
  });
  const [form, setForm] = useState({
    brandId: fragrance?.brandId || brands[0]?.id || "",
    model: fragrance?.model || "",
    reference: fragrance?.reference || "",
    description: fragrance?.description || "",
    conditionReport: fragrance?.conditionReport || "",
    price: fragrance?.price || 0,
    condition: fragrance?.condition || "UNWORN",
    year: fragrance?.year || new Date().getFullYear(),
    fragranceFamily: fragrance?.fragranceFamily || "FLORAL",
    bottleMaterial: fragrance?.bottleMaterial || "GLASS",
    bottleDetail: fragrance?.bottleDetail || "",
    bottleSize: fragrance?.bottleSize || 100,
    capType: fragrance?.capType || "SPRAY",
    liquidColor: fragrance?.liquidColor || "",
    longevity: fragrance?.longevity || "",
    bottleShape: fragrance?.bottleShape || "",
    concentration: fragrance?.concentration || "EDP",
    topNotes: notesToString(fragrance?.topNotes),
    heartNotes: notesToString(fragrance?.heartNotes),
    baseNotes: notesToString(fragrance?.baseNotes),
    sillage: fragrance?.sillage || "MODERATE",
    sustainabilityScore: fragrance?.sustainabilityScore ?? 3,
    isVegan: fragrance?.isVegan ?? false,
    isCrueltyFree: fragrance?.isCrueltyFree ?? true,
    sampleAvailable: fragrance?.sampleAvailable ?? false,
    gender: fragrance?.gender || "UNISEX",
    collection: fragrance?.collection || "",
    stock: fragrance?.stock ?? 0,
    rating: fragrance?.rating ?? "",
    featured: fragrance?.featured || false,
    category: fragrance?.category || "Floral",
    imageUrl: fragrance?.images[0]?.url || "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const url = fragrance
      ? `/api/admin/fragrances/${fragrance.id}`
      : "/api/admin/fragrances";
    const method = fragrance ? "PUT" : "POST";

    const payload = {
      ...form,
      topNotes: parseNotes(form.topNotes),
      heartNotes: parseNotes(form.heartNotes),
      baseNotes: parseNotes(form.baseNotes),
      bottleSize: Number(form.bottleSize),
      stock: Number(form.stock),
      rating:
        form.rating === "" || form.rating === null
          ? null
          : Number(form.rating),
      collection: form.collection || null,
      bottleDetail: form.bottleDetail || null,
      countryStocks: MANAGED_STOCK_COUNTRIES.map((c) => ({
        country: c.code,
        inStock: Boolean(countryStock[c.code]),
      })),
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      router.push("/admin/fragrances");
      router.refresh();
    } else {
      alert("Failed to save fragrance");
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!fragrance) return;
    if (!confirm("Delete this fragrance permanently?")) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/fragrances/${fragrance.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.push("/admin/fragrances");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Delete failed");
      setDeleting(false);
    }
  }

  const inputClass =
    "w-full px-4 py-2.5 border border-wf-border rounded text-sm focus:outline-none focus:border-gold bg-white";
  const labelClass = "block text-sm font-medium mb-1.5";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-wf-border rounded-lg p-6 max-w-2xl space-y-5"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Brand</label>
          <select
            value={form.brandId}
            onChange={(e) => setForm({ ...form, brandId: e.target.value })}
            className={inputClass}
            required
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Name</label>
          <input
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            className={inputClass}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Reference</label>
          <input
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Price ($)</label>
          <input
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            className={inputClass}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Gender</label>
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className={inputClass}
          >
            <option value="MENS">Men&apos;s</option>
            <option value="WOMENS">Women&apos;s</option>
            <option value="UNISEX">Unisex</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={inputClass}
          rows={4}
          required
        />
      </div>

      <div>
        <label className={labelClass}>Condition Report</label>
        <textarea
          value={form.conditionReport}
          onChange={(e) => setForm({ ...form, conditionReport: e.target.value })}
          className={inputClass}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Condition</label>
          <select
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value })}
            className={inputClass}
          >
            <option value="UNWORN">New</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Family</label>
          <select
            value={form.fragranceFamily}
            onChange={(e) => setForm({ ...form, fragranceFamily: e.target.value })}
            className={inputClass}
          >
            <option value="FLORAL">Floral</option>
            <option value="ORIENTAL">Oriental</option>
            <option value="WOODY">Woody</option>
            <option value="FRESH">Fresh</option>
            <option value="CITRUS">Citrus</option>
            <option value="SPICY">Spicy</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Year</label>
          <input
            type="number"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Bottle Material</label>
          <select
            value={form.bottleMaterial}
            onChange={(e) => setForm({ ...form, bottleMaterial: e.target.value })}
            className={inputClass}
          >
            <option value="GLASS">Glass</option>
            <option value="CRYSTAL">Crystal</option>
            <option value="METAL">Metal</option>
            <option value="CERAMIC">Ceramic</option>
            <option value="ACRYLIC">Acrylic</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Size (ml)</label>
          <select
            value={form.bottleSize}
            onChange={(e) => setForm({ ...form, bottleSize: Number(e.target.value) })}
            className={inputClass}
          >
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Cap</label>
          <select
            value={form.capType}
            onChange={(e) => setForm({ ...form, capType: e.target.value })}
            className={inputClass}
          >
            <option value="MAGNETIC">Magnetic</option>
            <option value="SPRAY">Spray</option>
            <option value="DAB_ON">Dab-on</option>
            <option value="SCREW">Screw</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Bottle detail (display)</label>
        <input
          value={form.bottleDetail}
          onChange={(e) => setForm({ ...form, bottleDetail: e.target.value })}
          className={inputClass}
          placeholder="Handcrafted German Glass"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Collection</label>
          <input
            value={form.collection}
            onChange={(e) => setForm({ ...form, collection: e.target.value })}
            className={inputClass}
            placeholder="Signature Collection"
          />
        </div>
        <div>
          <label className={labelClass}>Stock (global fallback)</label>
          <input
            type="number"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-wf-gray">
            Used for countries without a specific shop toggle below.
          </p>
        </div>
        <div>
          <label className={labelClass}>Rating (0-5)</label>
          <input
            type="number"
            step="0.1"
            min={0}
            max={5}
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: e.target.value })}
            className={inputClass}
            placeholder="4.8"
          />
        </div>
      </div>

      <div className="border border-wf-border p-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-espresso">Stock by shop / country</p>
          <p className="text-xs text-wf-gray mt-0.5">
            Shoppers in Ghana or Cameroon see availability for their location.
          </p>
        </div>
        <div className="flex flex-wrap gap-6">
          {MANAGED_STOCK_COUNTRIES.map((c) => (
            <label key={c.code} className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(countryStock[c.code])}
                onChange={(e) =>
                  setCountryStock((prev) => ({
                    ...prev,
                    [c.code]: e.target.checked,
                  }))
                }
              />
              In stock in {c.label} ({c.code})
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Concentration</label>
          <select
            value={form.concentration}
            onChange={(e) => setForm({ ...form, concentration: e.target.value })}
            className={inputClass}
          >
            <option value="EDT">Light Perfume Oil</option>
            <option value="EDP">EDP</option>
            <option value="PARFUM">Intense Perfume Oil</option>
            <option value="EXTRAIT">Pure Perfume Oil</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Sillage</label>
          <select
            value={form.sillage}
            onChange={(e) => setForm({ ...form, sillage: e.target.value })}
            className={inputClass}
          >
            <option value="SUBTLE">Subtle</option>
            <option value="MODERATE">Moderate</option>
            <option value="INTENSE">Intense</option>
            <option value="POWERFUL">Powerful</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Longevity</label>
          <input
            value={form.longevity}
            onChange={(e) => setForm({ ...form, longevity: e.target.value })}
            className={inputClass}
            placeholder="8-10 hours"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Liquid Color</label>
          <input
            value={form.liquidColor}
            onChange={(e) => setForm({ ...form, liquidColor: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Bottle Shape</label>
          <input
            value={form.bottleShape}
            onChange={(e) => setForm({ ...form, bottleShape: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Top Notes (comma-separated)</label>
        <input
          value={form.topNotes}
          onChange={(e) => setForm({ ...form, topNotes: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Heart Notes (comma-separated)</label>
        <input
          value={form.heartNotes}
          onChange={(e) => setForm({ ...form, heartNotes: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Base Notes (comma-separated)</label>
        <input
          value={form.baseNotes}
          onChange={(e) => setForm({ ...form, baseNotes: e.target.value })}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Image URL</label>
        <input
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          className={inputClass}
          placeholder="/images/fragrances/..."
        />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.sampleAvailable}
            onChange={(e) => setForm({ ...form, sampleAvailable: e.target.checked })}
            className="rounded text-gold"
          />
          Sample available
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isVegan}
            onChange={(e) => setForm({ ...form, isVegan: e.target.checked })}
            className="rounded text-gold"
          />
          Vegan
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isCrueltyFree}
            onChange={(e) => setForm({ ...form, isCrueltyFree: e.target.checked })}
            className="rounded text-gold"
          />
          Cruelty-free
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            className="rounded text-gold"
          />
          Featured
        </label>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-gold disabled:opacity-50">
          {loading ? "Saving..." : fragrance ? "Update Fragrance" : "Create Fragrance"}
        </button>
        {fragrance && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="btn-outline text-red-600 border-red-200 hover:border-red-500 hover:text-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Fragrance"}
          </button>
        )}
      </div>
    </form>
  );
}
