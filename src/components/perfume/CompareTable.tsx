"use client";

import Link from "next/link";
import { usePremiumStore } from "@/lib/premium-store";
import { useLocaleStore } from "@/lib/locale-store";
import Image from "next/image";
import {
  formatPrice,
  concentrationLabel,
  fragranceFamilyLabel,
  sillageLabel,
} from "@/lib/utils";

export function CompareTable() {
  const currency = useLocaleStore((s) => s.currency);
  useLocaleStore((s) => s.rates);
  const compare = usePremiumStore((s) => s.compare);
  const removeCompare = usePremiumStore((s) => s.removeCompare);
  const clearCompare = usePremiumStore((s) => s.clearCompare);

  if (compare.length < 2) {
    return (
      <div className="text-center py-16">
        <p className="font-playfair text-2xl mb-3">Add at least two perfumes</p>
        <p className="text-sm text-wf-gray mb-6">
          Use the Compare button on product pages (up to 3).
        </p>
        <Link href="/fragrances" className="btn-gold">
          Browse fragrances
        </Link>
      </div>
    );
  }

  const rows: { label: string; get: (i: (typeof compare)[0]) => string }[] = [
    { label: "Price", get: (i) => formatPrice(i.price, currency) },
    { label: "Family", get: (i) => fragranceFamilyLabel(i.fragranceFamily) },
    { label: "Concentration", get: (i) => concentrationLabel(i.concentration) },
    { label: "Size", get: (i) => `${i.bottleSize} ml` },
    { label: "Longevity", get: (i) => i.longevity || "-" },
    { label: "Sillage", get: (i) => sillageLabel(i.sillage) },
    {
      label: "Top notes",
      get: (i) => i.topNotes.join(", ") || "-",
    },
    {
      label: "Heart notes",
      get: (i) => i.heartNotes.join(", ") || "-",
    },
    {
      label: "Base notes",
      get: (i) => i.baseNotes.join(", ") || "-",
    },
  ];

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button type="button" onClick={clearCompare} className="btn-outline text-sm">
          Clear all
        </button>
      </div>
      <div className="overflow-x-auto border border-wf-border">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-wf-light">
              <th className="p-3 text-left w-36"> </th>
              {compare.map((c) => (
                <th key={c.id} className="p-3 text-left align-top">
                  <div className="relative aspect-square max-w-[140px] bg-white mb-2">
                    <Image
                      src={c.image || "/images/placeholders/fragrance.svg"}
                      alt={c.model}
                      fill
                      className="object-contain p-2"
                      sizes="140px"
                    />
                  </div>
                  <Link href={`/fragrances/${c.slug}`} className="hover:text-gold">
                    <span className="block text-xs text-wf-gray">{c.brand}</span>
                    <span className="font-playfair text-lg">{c.model}</span>
                  </Link>
                  <button
                    type="button"
                    className="mt-2 text-xs text-wf-gray hover:text-red-700"
                    onClick={() => removeCompare(c.id)}
                  >
                    Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-wf-border">
                <td className="p-3 text-wf-gray font-medium">{row.label}</td>
                {compare.map((c) => (
                  <td key={c.id + row.label} className="p-3 align-top">
                    {row.get(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
