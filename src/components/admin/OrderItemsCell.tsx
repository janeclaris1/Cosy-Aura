"use client";

import { useEffect, useId, useState } from "react";
import { Eye, X } from "lucide-react";
import { AdminButton } from "@/components/admin/admin-ui";

export type OrderItemsCellItem = {
  id: string;
  bottleSize: number;
  quantity: number;
  fragrance: { model: string; brand: { name: string } };
};

function formatItemLine(item: OrderItemsCellItem) {
  const name = `${item.fragrance.brand.name} ${item.fragrance.model}`;
  const size = item.bottleSize ? ` · ${item.bottleSize}ml` : "";
  const qty = item.quantity > 1 ? ` × ${item.quantity}` : "";
  return `${name}${size}${qty}`;
}

export function OrderItemsCell({
  items,
  orderLabel,
  orderHref,
}: {
  items: OrderItemsCellItem[];
  orderLabel: string;
  orderHref: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!items.length) {
    return <span className="text-[11px] text-mocha">—</span>;
  }

  const units = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <div className="flex flex-col items-start gap-1.5">
        <span className="text-[11px] text-mocha tabular-nums">
          {items.length} product{items.length === 1 ? "" : "s"}
          {units !== items.length ? ` · ${units} units` : ""}
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-[#03045e] ring-1 ring-[#03045e]/15 hover:bg-[#03045e]/5 transition-colors"
        >
          <Eye className="w-3 h-3" strokeWidth={1.75} />
          View
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close items dialog"
            onClick={() => setOpen(false)}
          />

          <div className="relative w-full max-w-md bg-white shadow-xl ring-1 ring-black/[0.06] rounded-2xl overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-stone-100">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-mocha">
                  Order items
                </p>
                <h2 id={titleId} className="font-playfair text-lg text-[#03045e] mt-1">
                  {orderLabel}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-mocha hover:bg-stone-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            <ul className="max-h-[min(24rem,60vh)] overflow-y-auto divide-y divide-stone-100">
              {items.map((item) => (
                <li key={item.id} className="px-5 py-3.5 text-sm text-espresso">
                  {formatItemLine(item)}
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-stone-100 bg-[#fafafa]/80">
              <AdminButton variant="ghost" onClick={() => setOpen(false)}>
                Close
              </AdminButton>
              <AdminButton href={orderHref} variant="secondary">
                Open order
              </AdminButton>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
