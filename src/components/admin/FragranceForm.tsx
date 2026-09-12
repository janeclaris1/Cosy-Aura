"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminButton,
  AdminCard,
  adminInputClass,
  adminLabelClass,
  adminSelectClass,
} from "@/components/admin/admin-ui";
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
    costPriceGhs?: number;
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
    explainerVideoUrl?: string | null;
    images: { url: string }[];
    countryStocks?: { country: string; inStock: boolean }[];
    barcodes?: { bottleSize: number; barcode: string }[];
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
  const [barcodes, setBarcodes] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = { "30": "", "50": "", "100": "" };
    for (const row of fragrance?.barcodes || []) {
      map[String(row.bottleSize)] = row.barcode;
    }
    return map;
  });
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
    costPriceGhs: fragrance?.costPriceGhs ?? 0,
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
    explainerVideoUrl: fragrance?.explainerVideoUrl || "",
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
      costPriceGhs: Math.max(0, Number(form.costPriceGhs) || 0),
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
      barcodes: [30, 50, 100].map((size) => ({
        bottleSize: size,
        barcode: barcodes[String(size)] || "",
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
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed to save fragrance");
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

  return (
    <AdminCard className="max-w-2xl">
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={adminLabelClass}>Brand</label>
          <select
            value={form.brandId}
            onChange={(e) => setForm({ ...form, brandId: e.target.value })}
            className={adminSelectClass}
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
          <label className={adminLabelClass}>Name</label>
          <input
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            className={adminInputClass}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={adminLabelClass}>Reference</label>
          <input
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
            className={adminInputClass}
            required
          />
        </div>
        <div>
          <label className={adminLabelClass}>Price (GHS)</label>
          <input
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            className={adminInputClass}
            required
          />
        </div>
        <div>
          <label className={adminLabelClass}>Unit cost (GHS)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.costPriceGhs}
            onChange={(e) =>
              setForm({ ...form, costPriceGhs: Number(e.target.value) })
            }
            className={adminInputClass}
          />
          <p className="text-[11px] text-mocha mt-1">
            For catalog bottle size; COGS scales for 30ml / 50ml / 100ml sales.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={adminLabelClass}>Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className={adminInputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={adminLabelClass}>Gender</label>
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className={adminInputClass}
          >
            <option value="MENS">Men&apos;s</option>
            <option value="WOMENS">Women&apos;s</option>
            <option value="UNISEX">Unisex</option>
          </select>
        </div>
      </div>

      <div>
        <label className={adminLabelClass}>Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={adminInputClass}
          rows={4}
          required
        />
      </div>

      <div>
        <label className={adminLabelClass}>Condition Report</label>
        <textarea
          value={form.conditionReport}
          onChange={(e) => setForm({ ...form, conditionReport: e.target.value })}
          className={adminInputClass}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={adminLabelClass}>Condition</label>
          <select
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value })}
            className={adminInputClass}
          >
            <option value="UNWORN">New</option>
          </select>
        </div>
        <div>
          <label className={adminLabelClass}>Family</label>
          <select
            value={form.fragranceFamily}
            onChange={(e) => setForm({ ...form, fragranceFamily: e.target.value })}
            className={adminInputClass}
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
          <label className={adminLabelClass}>Year</label>
          <input
            type="number"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
            className={adminInputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={adminLabelClass}>Bottle Material</label>
          <select
            value={form.bottleMaterial}
            onChange={(e) => setForm({ ...form, bottleMaterial: e.target.value })}
            className={adminInputClass}
          >
            <option value="GLASS">Glass</option>
            <option value="CRYSTAL">Crystal</option>
            <option value="METAL">Metal</option>
            <option value="CERAMIC">Ceramic</option>
            <option value="ACRYLIC">Acrylic</option>
          </select>
        </div>
        <div>
          <label className={adminLabelClass}>Size (ml)</label>
          <select
            value={form.bottleSize}
            onChange={(e) => setForm({ ...form, bottleSize: Number(e.target.value) })}
            className={adminInputClass}
          >
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div>
          <label className={adminLabelClass}>Cap</label>
          <select
            value={form.capType}
            onChange={(e) => setForm({ ...form, capType: e.target.value })}
            className={adminInputClass}
          >
            <option value="MAGNETIC">Magnetic</option>
            <option value="SPRAY">Spray</option>
            <option value="DAB_ON">Dab-on</option>
            <option value="SCREW">Screw</option>
          </select>
        </div>
      </div>

      <div>
        <label className={adminLabelClass}>Bottle detail (display)</label>
        <input
          value={form.bottleDetail}
          onChange={(e) => setForm({ ...form, bottleDetail: e.target.value })}
          className={adminInputClass}
          placeholder="Handcrafted German Glass"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={adminLabelClass}>Collection</label>
          <input
            value={form.collection}
            onChange={(e) => setForm({ ...form, collection: e.target.value })}
            className={adminInputClass}
            placeholder="Signature Collection"
          />
        </div>
        <div>
          <label className={adminLabelClass}>Stock (global fallback)</label>
          <input
            type="number"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
            className={adminInputClass}
          />
          <p className="mt-1 text-xs text-mocha">
            Used for countries without a specific shop toggle below.
          </p>
        </div>
        <div>
          <label className={adminLabelClass}>Rating (0-5)</label>
          <input
            type="number"
            step="0.1"
            min={0}
            max={5}
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: e.target.value })}
            className={adminInputClass}
            placeholder="4.8"
          />
        </div>
      </div>

      <div className="ring-1 ring-black/[0.04] bg-[#fafafa] p-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-espresso">Stock by shop / country</p>
          <p className="text-xs text-mocha mt-0.5">
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
          <label className={adminLabelClass}>Concentration</label>
          <select
            value={form.concentration}
            onChange={(e) => setForm({ ...form, concentration: e.target.value })}
            className={adminInputClass}
          >
            <option value="EDT">Light Perfume Oil</option>
            <option value="EDP">EDP</option>
            <option value="PARFUM">Intense Perfume Oil</option>
            <option value="EXTRAIT">Pure Perfume Oil</option>
          </select>
        </div>
        <div>
          <label className={adminLabelClass}>Sillage</label>
          <select
            value={form.sillage}
            onChange={(e) => setForm({ ...form, sillage: e.target.value })}
            className={adminInputClass}
          >
            <option value="SUBTLE">Subtle</option>
            <option value="MODERATE">Moderate</option>
            <option value="INTENSE">Intense</option>
            <option value="POWERFUL">Powerful</option>
          </select>
        </div>
        <div>
          <label className={adminLabelClass}>Longevity</label>
          <input
            value={form.longevity}
            onChange={(e) => setForm({ ...form, longevity: e.target.value })}
            className={adminInputClass}
            placeholder="8-10 hours"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={adminLabelClass}>Liquid Color</label>
          <input
            value={form.liquidColor}
            onChange={(e) => setForm({ ...form, liquidColor: e.target.value })}
            className={adminInputClass}
          />
        </div>
        <div>
          <label className={adminLabelClass}>Bottle Shape</label>
          <input
            value={form.bottleShape}
            onChange={(e) => setForm({ ...form, bottleShape: e.target.value })}
            className={adminInputClass}
          />
        </div>
      </div>

      <div>
        <label className={adminLabelClass}>Top Notes (comma-separated)</label>
        <input
          value={form.topNotes}
          onChange={(e) => setForm({ ...form, topNotes: e.target.value })}
          className={adminInputClass}
        />
      </div>
      <div>
        <label className={adminLabelClass}>Heart Notes (comma-separated)</label>
        <input
          value={form.heartNotes}
          onChange={(e) => setForm({ ...form, heartNotes: e.target.value })}
          className={adminInputClass}
        />
      </div>
      <div>
        <label className={adminLabelClass}>Base Notes (comma-separated)</label>
        <input
          value={form.baseNotes}
          onChange={(e) => setForm({ ...form, baseNotes: e.target.value })}
          className={adminInputClass}
        />
      </div>

      <div>
        <label className={adminLabelClass}>Image URL</label>
        <input
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          className={adminInputClass}
          placeholder="/images/fragrances/..."
        />
      </div>

      <div>
        <label className={adminLabelClass}>Explainer video URL (optional)</label>
        <input
          value={form.explainerVideoUrl}
          onChange={(e) => setForm({ ...form, explainerVideoUrl: e.target.value })}
          className={adminInputClass}
          placeholder="YouTube link or /videos/product-explainer.mp4"
        />
        <p className="mt-1 text-xs text-mocha">
          Shows as a play-button thumbnail in the product gallery. Supports YouTube and direct MP4/WebM URLs.
        </p>
      </div>

      <div className="ring-1 ring-black/[0.04] p-4 space-y-3 bg-[#fafafa]">
        <div>
          <p className="text-sm font-medium">POS barcodes</p>
          <p className="text-xs text-mocha mt-0.5">
            Auto-generated on save: 30 ml → starts with 3, 50 ml → 5, 100 ml → 1.
            Custom codes must follow the same first digit for that size.
          </p>
        </div>
        {fragrance && (
          <div className="flex flex-wrap gap-2">
            <a
              href={`/admin/fragrances/${fragrance.id}/labels`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#03045e] hover:underline font-medium"
            >
              Print barcode labels →
            </a>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[30, 50, 100].map((size) => (
            <div key={size}>
              <label className={adminLabelClass}>{size} ml barcode</label>
              <input
                value={barcodes[String(size)]}
                onChange={(e) =>
                  setBarcodes((prev) => ({ ...prev, [String(size)]: e.target.value }))
                }
                className={`${adminInputClass} font-mono`}
                placeholder={size === 30 ? "3…" : size === 50 ? "5…" : "1…"}
                inputMode="numeric"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.sampleAvailable}
            onChange={(e) => setForm({ ...form, sampleAvailable: e.target.checked })}
            className="rounded text-[#03045e]"
          />
          Sample available
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isVegan}
            onChange={(e) => setForm({ ...form, isVegan: e.target.checked })}
            className="rounded text-[#03045e]"
          />
          Vegan
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isCrueltyFree}
            onChange={(e) => setForm({ ...form, isCrueltyFree: e.target.checked })}
            className="rounded text-[#03045e]"
          />
          Cruelty-free
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            className="rounded text-[#03045e]"
          />
          Featured
        </label>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <AdminButton type="submit" disabled={loading}>
          {loading ? "Saving..." : fragrance ? "Update Fragrance" : "Create Fragrance"}
        </AdminButton>
        {fragrance && (
          <AdminButton
            type="button"
            variant="secondary"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 border-red-200 hover:border-red-500 hover:text-red-700 hover:bg-red-50"
          >
            {deleting ? "Deleting..." : "Delete Fragrance"}
          </AdminButton>
        )}
      </div>
    </form>
    </AdminCard>
  );
}
